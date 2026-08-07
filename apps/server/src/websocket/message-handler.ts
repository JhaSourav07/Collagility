import type { IncomingMessage } from '../types/client.js';
import type { Broadcaster } from './broadcaster.js';
import type { SessionManager } from '../sessions/session-manager.js';
import type { ServerLogger } from '../logger/logger.js';
import { createPongEvent } from './events.js';
import { handleCreateSession } from '../sessions/handlers/create-session.js';
import { handleJoinSession } from '../sessions/handlers/join-session.js';
import { handleLeaveSession } from '../sessions/handlers/leave-session.js';
import {
  createChatMessageEvent,
  createAIStreamErrorEvent,
  createTerminalScreenStreamEvent,
  createSessionStreamBroadcastEvent,
  EVENT_TYPES,
  type TerminalScreenStreamPayload,
  type StreamChunk,
} from '@collagility/protocol';
import { StreamManager } from '@collagility/stream';

export class MessageHandler {
  private broadcaster: Broadcaster;
  private sessionManager: SessionManager;
  private logger: ServerLogger;
  private streamManager: StreamManager;
  private sessionSeqMap: Map<string, number> = new Map();

  constructor(broadcaster: Broadcaster, sessionManager: SessionManager, logger: ServerLogger) {
    this.broadcaster = broadcaster;
    this.sessionManager = sessionManager;
    this.logger = logger;
    this.streamManager = new StreamManager();

    // Broadcast stream events emitted by StreamManager to session participants
    this.streamManager.on('streamEvent', (eventEnvelope: { sessionId?: string }) => {
      if (eventEnvelope.sessionId) {
        this.broadcaster.broadcastToSession(eventEnvelope.sessionId, eventEnvelope);
      } else {
        this.broadcaster.broadcast(eventEnvelope);
      }
    });
  }

  public getStreamManager(): StreamManager {
    return this.streamManager;
  }

  public async handleMessage(clientId: string, message: IncomingMessage): Promise<void> {
    this.logger.debug({ clientId, messageType: message.type }, 'Handling incoming packet');

    switch (message.type) {
      case 'ping':
      case 'system.ping': {
        const pong = createPongEvent();
        this.broadcaster.sendToClient(clientId, pong);
        break;
      }

      case 'session.create': {
        await handleCreateSession(
          clientId,
          message.payload as Record<string, unknown> | undefined,
          this.sessionManager,
          this.broadcaster
        );
        break;
      }

      case 'session.join': {
        await handleJoinSession(
          clientId,
          message.payload as { sessionId: string },
          this.sessionManager,
          this.broadcaster
        );

        // Check for active stream and provide snapshot to late joiner
        const joinPayload = message.payload as { sessionId?: string };
        if (joinPayload?.sessionId) {
          const snapshot = this.streamManager.getLateJoinerState(joinPayload.sessionId);
          if (snapshot) {
            this.broadcaster.sendToClient(clientId, {
              type: EVENT_TYPES.AI_STREAM_PROGRESS,
              payload: snapshot,
              timestamp: Date.now(),
            });
          }

          // Check for rolling terminal screen buffer and paint initial screen for late joiner
          const terminalBuffer = this.sessionManager.getTerminalBuffer(joinPayload.sessionId);
          if (terminalBuffer) {
            const screenEvent = createTerminalScreenStreamEvent({
              sessionId: joinPayload.sessionId,
              senderId: 'system',
              pane: 'right',
              data: terminalBuffer,
              timestamp: Date.now(),
            });
            this.broadcaster.sendToClient(clientId, screenEvent);
          }
        }
        break;
      }

      case 'session.leave': {
        await handleLeaveSession(clientId, this.sessionManager, this.broadcaster);
        break;
      }

      case 'chat':
      case 'chat.message': {
        const session = await this.sessionManager.getClientSession(clientId);
        const text = (message.payload as { text?: string })?.text || String(message.payload || '');

        if (session) {
          const isOwner = session.ownerId === clientId;
          const role = isOwner ? ('owner' as const) : ('member' as const);
          const currentSeq = (this.sessionSeqMap.get(session.id) || 0) + 1;
          this.sessionSeqMap.set(session.id, currentSeq);

          const chatEnvelope = createChatMessageEvent(
            { id: clientId, name: clientId.slice(0, 8), role },
            text,
            session.id,
            currentSeq
          );

          this.logger.info(
            { clientId, sessionId: session.id, seq: currentSeq },
            'Broadcasting chat message to session members'
          );
          // Broadcast to EVERY participant in the session (including sender for confirmation)
          await this.broadcaster.broadcastToSession(session.id, chatEnvelope);
        } else {
          // Fallback if client is not in a session yet
          const fallbackEnvelope = createChatMessageEvent(
            { id: clientId, name: clientId.slice(0, 8), role: 'member' as const },
            text
          );
          this.broadcaster.broadcast(fallbackEnvelope);
        }
        break;
      }

      case 'ai.prompt':
      case 'ai.stream.prompt': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (!session) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'You must join a session before sending AI prompts' })
          );
          break;
        }

        if (session.ownerId !== clientId) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'Only the session owner can initiate an AI stream' }, session.id)
          );
          break;
        }

        const payloadObj = message.payload as { prompt?: string; adapterName?: string };
        const prompt = payloadObj?.prompt || '';
        const adapterName = payloadObj?.adapterName || 'gemini';

        try {
          this.logger.info(
            { clientId, sessionId: session.id, adapterName, prompt },
            'Starting AI Stream session turn'
          );
          this.streamManager.startStream({
            sessionId: session.id,
            ownerId: clientId,
            prompt,
            adapterName,
          });
        } catch (err) {
          const messageStr = err instanceof Error ? err.message : String(err);
          this.logger.error({ clientId, sessionId: session.id, error: messageStr }, 'Failed to start AI stream');
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: messageStr }, session.id)
          );
        }
        break;
      }

      case 'ai.stream.chunk': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (session) {
          const chunkObj = message.payload as any;
          this.logger.debug(
            { sessionId: session.id, streamId: chunkObj?.streamId, seq: chunkObj?.sequenceNumber, isFinal: chunkObj?.isFinal },
            'Received AI stream chunk from client'
          );
          this.streamManager.handleChunk(session.id, chunkObj);
        }
        break;
      }

      case 'ai.stream.completed': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (session) {
          this.logger.info({ clientId, sessionId: session.id }, 'AI Stream completed');
          this.streamManager.completeStream(session.id);
        }
        break;
      }

      case 'ai.stream.failed': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (session) {
          const errStr = (message.payload as { error?: string })?.error || 'AI execution failed';
          this.logger.error({ clientId, sessionId: session.id, error: errStr }, 'AI Stream failed');
          this.streamManager.failStream(session.id, errStr);
        }
        break;
      }

      case 'ai.cancel':
      case 'ai.stream.cancel': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (session) {
          if (session.ownerId !== clientId) {
            this.broadcaster.sendToClient(
              clientId,
              createAIStreamErrorEvent({ error: 'Only the session owner can cancel the AI stream' }, session.id)
            );
            break;
          }
          const reason = (message.payload as { reason?: string })?.reason || 'Owner requested cancellation';
          this.streamManager.cancelStream(session.id, clientId, reason);
        }
        break;
      }

      case 'ai.answer':
      case 'ai.plan.approve':
      case 'ai.plan.reject':
      case 'ai.selection.response':
      case 'ai.confirmation.response':
      case 'ai.tool.approved':
      case 'ai.tool.rejected': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (!session) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'You must be in a session to respond to AI interactions' })
          );
          break;
        }

        if (session.ownerId !== clientId) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'Only the session owner can respond to AI prompts' }, session.id)
          );
          break;
        }

        // Broadcast owner interactive response to all participants
        const interactiveEnvelope = {
          version: 1,
          type: message.type,
          sessionId: session.id,
          sender: { id: clientId, name: clientId.slice(0, 8), role: 'owner' as const },
          payload: message.payload,
          timestamp: Date.now(),
        };

        await this.broadcaster.broadcastToSession(session.id, interactiveEnvelope);
        break;
      }

      case EVENT_TYPES.SESSION_PERMISSION_REQUEST:
      case 'session.permission.request':
      case 'permission_required': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (!session) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'You must join a session before sending permission requests' })
          );
          break;
        }

        const permReqEnvelope = {
          version: 1,
          type: EVENT_TYPES.SESSION_PERMISSION_REQUEST,
          sessionId: session.id,
          sender: { id: clientId, name: clientId.slice(0, 8), role: session.ownerId === clientId ? 'owner' : 'member' },
          payload: message.payload,
          timestamp: Date.now(),
        };

        this.logger.info(
          { clientId, sessionId: session.id, toolName: (message.payload as any)?.toolName },
          'Relaying session permission request to all session participants'
        );

        await this.broadcaster.broadcastToSession(session.id, permReqEnvelope);
        break;
      }

      case EVENT_TYPES.SESSION_PERMISSION_RESPONSE:
      case 'session.permission.response':
      case 'permission_response': {
        const session = await this.sessionManager.getClientSession(clientId);
        if (!session) {
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'You must be in a session to respond to permission requests' })
          );
          break;
        }

        // Restrict resolution permissions: ONLY session owner can approve or deny
        if (session.ownerId !== clientId) {
          this.logger.warn(
            { clientId, ownerId: session.ownerId, sessionId: session.id },
            'Non-host client attempted to resolve permission request'
          );
          this.broadcaster.sendToClient(
            clientId,
            createAIStreamErrorEvent({ error: 'Only the session owner can respond to permission requests' }, session.id)
          );
          break;
        }

        const permResEnvelope = {
          version: 1,
          type: EVENT_TYPES.SESSION_PERMISSION_RESPONSE,
          sessionId: session.id,
          sender: { id: clientId, name: clientId.slice(0, 8), role: 'owner' as const },
          payload: message.payload,
          timestamp: Date.now(),
        };

        this.logger.info(
          { clientId, sessionId: session.id, decision: (message.payload as any)?.decision },
          'Broadcasting host permission resolution response to session'
        );

        await this.broadcaster.broadcastToSession(session.id, permResEnvelope);
        break;
      }

      case EVENT_TYPES.TERMINAL_SCREEN_STREAM:
      case 'terminal.screen.stream':
      case 'TERMINAL_SCREEN_STREAM': {
        const session = await this.sessionManager.getClientSession(clientId);
        const payloadObj = message.payload as any;
        const targetSessionId = session?.id || payloadObj?.sessionId;

        if (targetSessionId) {
          const streamPayload: TerminalScreenStreamPayload = {
            sessionId: targetSessionId,
            senderId: clientId,
            pane: payloadObj?.pane || 'right',
            data: payloadObj?.data || '',
            cols: payloadObj?.cols,
            rows: payloadObj?.rows,
            timestamp: payloadObj?.timestamp || Date.now(),
          };

          // Maintain lightweight rolling terminal buffer (last 50KB) for late joiners
          if (streamPayload.data) {
            this.sessionManager.appendTerminalBuffer(targetSessionId, streamPayload.data);
          }

          const eventEnvelope = createTerminalScreenStreamEvent(streamPayload);

          this.logger.debug(
            { clientId, sessionId: targetSessionId, pane: streamPayload.pane, bytes: streamPayload.data.length },
            'Broadcasting TERMINAL_SCREEN_STREAM chunk to session peers'
          );

          // Broadcast to all clients in session EXCEPT the host sender (clientId)
          await this.broadcaster.broadcastToSession(targetSessionId, eventEnvelope, clientId);
        }
        break;
      }

      case EVENT_TYPES.SESSION_STREAM_BROADCAST:
      case 'session.stream.broadcast':
      case 'SESSION_STREAM_BROADCAST': {
        const session = await this.sessionManager.getClientSession(clientId);
        const payloadObj = message.payload as any;
        const targetSessionId = session?.id || payloadObj?.sessionId;

        if (targetSessionId && payloadObj?.chunk) {
          const chunk: StreamChunk = payloadObj.chunk;
          this.sessionManager.appendStreamChunk(targetSessionId, chunk);

          const eventEnvelope = createSessionStreamBroadcastEvent({
            sessionId: targetSessionId,
            chunk,
            timestamp: payloadObj.timestamp || Date.now(),
          });

          this.logger.debug(
            { clientId, sessionId: targetSessionId, chunkId: chunk.id, type: chunk.type },
            'Broadcasting SESSION_STREAM_BROADCAST chunk to session peers'
          );

          await this.broadcaster.broadcastToSession(targetSessionId, eventEnvelope, clientId);
        }
        break;
      }

      default: {
        const session = await this.sessionManager.getClientSession(clientId);
        const genericEvent = {
          version: 1,
          type: message.type,
          senderId: clientId,
          sessionId: session?.id,
          payload: message.payload,
          timestamp: Date.now(),
        };

        if (session) {
          await this.broadcaster.broadcastToSession(session.id, genericEvent);
        } else {
          this.broadcaster.broadcast(genericEvent);
        }
        break;
      }
    }
  }
}

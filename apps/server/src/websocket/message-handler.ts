import type { IncomingMessage } from '../types/client.js';
import type { Broadcaster } from './broadcaster.js';
import type { SessionManager } from '../sessions/session-manager.js';
import type { ServerLogger } from '../logger/logger.js';
import { createPongEvent } from './events.js';
import { handleCreateSession } from '../sessions/handlers/create-session.js';
import { handleJoinSession } from '../sessions/handlers/join-session.js';
import { handleLeaveSession } from '../sessions/handlers/leave-session.js';
import { createChatMessageEvent } from '@collagility/protocol';

export class MessageHandler {
  private broadcaster: Broadcaster;
  private sessionManager: SessionManager;
  private logger: ServerLogger;
  private sessionSeqMap: Map<string, number> = new Map();

  constructor(broadcaster: Broadcaster, sessionManager: SessionManager, logger: ServerLogger) {
    this.broadcaster = broadcaster;
    this.sessionManager = sessionManager;
    this.logger = logger;
  }

  public handleMessage(clientId: string, message: IncomingMessage): void {
    this.logger.debug({ clientId, messageType: message.type }, 'Handling incoming packet');

    switch (message.type) {
      case 'ping':
      case 'system.ping': {
        const pong = createPongEvent();
        this.broadcaster.sendToClient(clientId, pong);
        break;
      }

      case 'session.create': {
        handleCreateSession(
          clientId,
          message.payload as Record<string, unknown> | undefined,
          this.sessionManager,
          this.broadcaster
        );
        break;
      }

      case 'session.join': {
        handleJoinSession(
          clientId,
          message.payload as { sessionId: string },
          this.sessionManager,
          this.broadcaster
        );
        break;
      }

      case 'session.leave': {
        handleLeaveSession(clientId, this.sessionManager, this.broadcaster);
        break;
      }

      case 'chat':
      case 'chat.message': {
        const session = this.sessionManager.getClientSession(clientId);
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
          this.broadcaster.broadcastToSession(session.id, chatEnvelope);
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

      default: {
        const session = this.sessionManager.getClientSession(clientId);
        const genericEvent = {
          version: 1,
          type: message.type,
          senderId: clientId,
          payload: message.payload,
          timestamp: Date.now(),
        };

        if (session) {
          this.broadcaster.broadcastToSession(session.id, genericEvent);
        } else {
          this.broadcaster.broadcast(genericEvent);
        }
        break;
      }
    }
  }
}

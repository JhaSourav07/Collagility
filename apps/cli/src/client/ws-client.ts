import WebSocket from 'ws';
import { z } from 'zod';
import type { CLIConfig } from '../config/config.js';
import { ReconnectHandler } from './reconnect.js';
import type { ChatRenderMessage } from '../terminal/renderer.js';

import type {
  AIStreamStartedPayload,
  AIStreamChunkPayload,
  AIStreamCompletedPayload,
  AIStreamCancelledPayload,
  AIStreamFailedPayload,
  AIStreamErrorPayload,
} from '@collagility/protocol';

export const IncomingFrameSchema = z.object({
  version: z.number().optional(),
  id: z.string().optional(),
  type: z.string(),
  senderId: z.string().optional(),
  sender: z.object({
    id: z.string(),
    name: z.string().optional(),
    role: z.enum(['owner', 'member', 'system', 'ai']).optional(),
  }).optional(),
  sessionId: z.string().optional(),
  payload: z.unknown().optional(),
  timestamp: z.number().optional(),
});

export type IncomingFrame = z.infer<typeof IncomingFrameSchema>;

export interface WSClientEvents {
  onConnected?: (clientId: string) => void;
  onSessionCreated?: (session: Record<string, unknown>) => void;
  onSessionJoined?: (session: Record<string, unknown>, memberId: string) => void;
  onMemberJoined?: (sessionId: string, memberId: string) => void;
  onMemberLeft?: (sessionId: string, memberId: string, isOwner: boolean) => void;
  onSessionLeft?: (sessionId: string) => void;
  onSessionClosed?: (sessionId: string, reason: string) => void;
  onChatMessage?: (message: ChatRenderMessage) => void;
  onChatSystem?: (message: string) => void;
  onStreamStarted?: (payload: AIStreamStartedPayload) => void;
  onStreamChunk?: (payload: AIStreamChunkPayload) => void;
  onStreamCompleted?: (payload: AIStreamCompletedPayload) => void;
  onStreamCancelled?: (payload: AIStreamCancelledPayload) => void;
  onStreamFailed?: (payload: AIStreamFailedPayload) => void;
  onStreamError?: (payload: AIStreamErrorPayload) => void;
  onError?: (error: string, code?: string) => void;
  onDisconnect?: (reason: string) => void;
  onReconnecting?: (attempt: number, delayMs: number) => void;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: CLIConfig;
  private reconnectHandler: ReconnectHandler;
  private events: WSClientEvents = {};
  private clientId: string | null = null;
  private isExplicitClose = false;

  constructor(config: CLIConfig, events: WSClientEvents = {}) {
    this.config = config;
    this.events = events;
    this.reconnectHandler = new ReconnectHandler(
      config.maxReconnectAttempts,
      config.reconnectIntervalMs
    );
  }

  public connect(): Promise<string> {
    this.isExplicitClose = false;
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.serverUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.terminate();
            reject(new Error(`Connection to server '${this.config.serverUrl}' timed out`));
          }
        }, 10000);

        this.socket.on('open', () => {
          this.reconnectHandler.reset();
        });

        this.socket.on('message', (raw: Buffer | string) => {
          try {
            const parsed = JSON.parse(raw.toString('utf-8'));
            const frame = IncomingFrameSchema.parse(parsed);
            this.handleFrame(frame, resolve);
          } catch (err) {
            if (this.events.onError) {
              const msg = err instanceof Error ? err.message : String(err);
              this.events.onError(`Invalid frame received from server: ${msg}`);
            }
          }
        });

        this.socket.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          const reasonStr = reason.toString('utf-8') || `Code ${code}`;
          if (this.events.onDisconnect) {
            this.events.onDisconnect(reasonStr);
          }

          if (!this.isExplicitClose && this.config.autoReconnect && this.reconnectHandler.shouldReconnect()) {
            const delay = this.reconnectHandler.getNextDelay();
            if (this.events.onReconnecting) {
              this.events.onReconnecting(this.reconnectHandler.getAttempts(), delay);
            }
            setTimeout(() => {
              this.connect().catch(() => {});
            }, delay);
          }
        });

        this.socket.on('error', (err) => {
          clearTimeout(connectionTimeout);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleFrame(frame: IncomingFrame, resolveConnect?: (clientId: string) => void): void {
    switch (frame.type) {
      case 'system.connected': {
        const payload = frame.payload as { clientId: string };
        this.clientId = payload.clientId;
        if (resolveConnect) resolveConnect(payload.clientId);
        if (this.events.onConnected) this.events.onConnected(payload.clientId);
        break;
      }

      case 'system.disconnected': {
        break;
      }

      case 'session.created': {
        const payload = frame.payload as { session: Record<string, unknown> };
        if (this.events.onSessionCreated) this.events.onSessionCreated(payload.session);
        break;
      }

      case 'session.joined': {
        const payload = frame.payload as { session: Record<string, unknown>; memberId: string };
        if (this.events.onSessionJoined) this.events.onSessionJoined(payload.session, payload.memberId);
        break;
      }

      case 'member.joined': {
        const payload = frame.payload as { sessionId: string; memberId: string };
        if (this.events.onMemberJoined) this.events.onMemberJoined(payload.sessionId, payload.memberId);
        break;
      }

      case 'member.left': {
        const payload = frame.payload as { sessionId: string; memberId: string; isOwner: boolean };
        if (this.events.onMemberLeft) this.events.onMemberLeft(payload.sessionId, payload.memberId, payload.isOwner);
        break;
      }

      case 'session.left': {
        const payload = frame.payload as { sessionId: string };
        if (this.events.onSessionLeft) this.events.onSessionLeft(payload.sessionId);
        break;
      }

      case 'session.closed': {
        const payload = frame.payload as { sessionId: string; reason: string };
        if (this.events.onSessionClosed) this.events.onSessionClosed(payload.sessionId, payload.reason);
        break;
      }

      case 'chat':
      case 'chat.message': {
        const senderId = frame.sender?.id || frame.senderId || 'unknown';
        const senderName = frame.sender?.name || senderId.slice(0, 8);
        const senderRole = frame.sender?.role || 'member';
        const payloadObj = (frame.payload as { text?: string }) || {};
        const text = payloadObj.text || '';
        const isSelf = senderId === this.clientId;

        if (this.events.onChatMessage) {
          this.events.onChatMessage({
            id: frame.id,
            timestamp: frame.timestamp || Date.now(),
            senderId,
            senderName,
            senderRole,
            text,
            isSelf,
          });
        }
        break;
      }

      case 'chat.system': {
        const payloadObj = (frame.payload as { message?: string }) || {};
        if (this.events.onChatSystem && payloadObj.message) {
          this.events.onChatSystem(payloadObj.message);
        }
        break;
      }

      case 'ai.stream.started': {
        if (this.events.onStreamStarted) this.events.onStreamStarted(frame.payload as AIStreamStartedPayload);
        break;
      }

      case 'ai.stream.chunk': {
        if (this.events.onStreamChunk) this.events.onStreamChunk(frame.payload as AIStreamChunkPayload);
        break;
      }

      case 'ai.stream.completed': {
        if (this.events.onStreamCompleted) this.events.onStreamCompleted(frame.payload as AIStreamCompletedPayload);
        break;
      }

      case 'ai.stream.cancelled': {
        if (this.events.onStreamCancelled) this.events.onStreamCancelled(frame.payload as AIStreamCancelledPayload);
        break;
      }

      case 'ai.stream.failed': {
        if (this.events.onStreamFailed) this.events.onStreamFailed(frame.payload as AIStreamFailedPayload);
        break;
      }

      case 'ai.stream.error': {
        if (this.events.onStreamError) this.events.onStreamError(frame.payload as AIStreamErrorPayload);
        break;
      }

      case 'system.error':
      case 'session.error': {
        const payload = frame.payload as { error: string; code?: string };
        if (this.events.onError) this.events.onError(payload.error, payload.code);
        break;
      }
    }
  }

  public send(type: string, payload?: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send packet: WebSocket is not connected');
    }
    const message = JSON.stringify({ type, payload });
    this.socket.send(message);
  }

  public sendChatMessage(text: string): void {
    this.send('chat.message', { text });
  }

  public sendAIPrompt(prompt: string, adapterName = 'gemini'): void {
    this.send('ai.stream.prompt', { prompt, adapterName });
  }

  public createSession(metadata?: Record<string, unknown>): void {
    this.send('session.create', { metadata });
  }

  public joinSession(sessionId: string): void {
    this.send('session.join', { sessionId });
  }

  public leaveSession(): void {
    this.send('session.leave');
  }

  public disconnect(): void {
    this.isExplicitClose = true;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  public getClientId(): string | null {
    return this.clientId;
  }
}

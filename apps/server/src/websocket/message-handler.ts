import type { IncomingMessage } from '../types/client.js';
import type { Broadcaster } from './broadcaster.js';
import type { SessionManager } from '../sessions/session-manager.js';
import type { ServerLogger } from '../logger/logger.js';
import { createPongEvent, createChatEvent } from './events.js';
import { handleCreateSession } from '../sessions/handlers/create-session.js';
import { handleJoinSession } from '../sessions/handlers/join-session.js';
import { handleLeaveSession } from '../sessions/handlers/leave-session.js';

export class MessageHandler {
  private broadcaster: Broadcaster;
  private sessionManager: SessionManager;
  private logger: ServerLogger;

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

      case 'chat': {
        // Scope chat messages to client's active session
        const session = this.sessionManager.getClientSession(clientId);
        const chatEvent = createChatEvent(clientId, message.payload);

        if (session) {
          this.broadcaster.broadcastToSession(session.id, chatEvent);
        } else {
          // Fallback if not in session yet
          this.broadcaster.broadcast(chatEvent);
        }
        break;
      }

      default: {
        const session = this.sessionManager.getClientSession(clientId);
        const genericEvent = {
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

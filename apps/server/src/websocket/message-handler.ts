import type { IncomingMessage } from '../types/client.js';
import type { Broadcaster } from './broadcaster.js';
import type { ServerLogger } from '../logger/logger.js';
import { createPongEvent, createChatEvent } from './events.js';

export class MessageHandler {
  private broadcaster: Broadcaster;
  private logger: ServerLogger;

  constructor(broadcaster: Broadcaster, logger: ServerLogger) {
    this.broadcaster = broadcaster;
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

      case 'chat': {
        const chatEvent = createChatEvent(clientId, message.payload);
        this.broadcaster.broadcast(chatEvent);
        break;
      }

      default: {
        // Broadcast custom extension messages to all connected clients
        const genericEvent = {
          type: message.type,
          senderId: clientId,
          payload: message.payload,
          timestamp: Date.now(),
        };
        this.broadcaster.broadcast(genericEvent);
        break;
      }
    }
  }
}

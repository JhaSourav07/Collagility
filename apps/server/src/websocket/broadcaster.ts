import WebSocket from 'ws';
import type { ConnectionManager } from './client.js';
import type { ServerLogger } from '../logger/logger.js';

export class Broadcaster {
  private connectionManager: ConnectionManager;
  private logger: ServerLogger;

  constructor(connectionManager: ConnectionManager, logger: ServerLogger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  public broadcast(message: string | object, excludeClientId?: string): number {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const clients = this.connectionManager.getAllClients();
    let deliveredCount = 0;

    for (const client of clients) {
      if (excludeClientId && client.id === excludeClientId) {
        continue;
      }

      const isOpen = Number(client.socket.readyState) === 1 || Number(client.socket.readyState) === WebSocket.OPEN;
      if (isOpen) {
        try {
          client.socket.send(payload);
          deliveredCount++;
        } catch (error) {
          this.logger.error({ clientId: client.id, error }, 'Failed to send broadcast message to client');
        }
      }
    }

    this.logger.info(
      { deliveredCount, totalClients: clients.length, excludedClient: excludeClientId },
      'Message broadcast complete'
    );

    return deliveredCount;
  }

  public sendToClient(clientId: string, message: string | object): boolean {
    const client = this.connectionManager.getClient(clientId);
    if (!client) {
      return false;
    }

    const isOpen = Number(client.socket.readyState) === 1 || Number(client.socket.readyState) === WebSocket.OPEN;
    if (!isOpen) {
      return false;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    try {
      client.socket.send(payload);
      return true;
    } catch (error) {
      this.logger.error({ clientId, error }, 'Failed to send message to specific client');
      return false;
    }
  }
}

import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import type { ConnectedClient } from '../types/client.js';
import type { ServerLogger } from '../logger/logger.js';

export class ConnectionManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private logger: ServerLogger;

  constructor(logger: ServerLogger) {
    this.logger = logger;
  }

  public registerClient(socket: WebSocket, metadata?: Record<string, unknown>): ConnectedClient {
    const id = randomUUID();
    const client: ConnectedClient = {
      id,
      socket,
      connectedAt: new Date(),
      isAlive: true,
      metadata,
    };

    this.clients.set(id, client);
    this.logger.info({ clientId: id, activeClients: this.clients.size }, 'Client registered');
    return client;
  }

  public removeClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    this.clients.delete(clientId);
    this.logger.info({ clientId, activeClients: this.clients.size }, 'Client unregistered');
    return true;
  }

  public getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): ConnectedClient[] {
    return Array.from(this.clients.values());
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public clearAll(): void {
    for (const client of this.clients.values()) {
      try {
        const isOpen = Number(client.socket.readyState) === 1 || Number(client.socket.readyState) === WebSocket.OPEN;
        if (isOpen) {
          client.socket.close(1001, 'Server shutting down');
        }
      } catch (err) {
        this.logger.error({ clientId: client.id, error: err }, 'Error closing client socket during clearAll');
      }
    }
    this.clients.clear();
  }
}

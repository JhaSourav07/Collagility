import WebSocket from 'ws';
import type { ConnectionManager } from './client.js';
import type { SessionManager } from '../sessions/session-manager.js';
import type { ServerLogger } from '../logger/logger.js';

export class Broadcaster {
  private connectionManager: ConnectionManager;
  private sessionManager: SessionManager | null = null;
  private logger: ServerLogger;

  constructor(connectionManager: ConnectionManager, logger: ServerLogger) {
    this.connectionManager = connectionManager;
    this.logger = logger;
  }

  public setSessionManager(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
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
      'Global message broadcast complete'
    );

    return deliveredCount;
  }

  public broadcastToSession(sessionId: string, message: string | object, excludeClientId?: string): number {
    if (!this.sessionManager) {
      this.logger.warn('SessionManager not set on Broadcaster, falling back to global broadcast');
      return this.broadcast(message, excludeClientId);
    }

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      this.logger.warn({ sessionId }, 'Cannot broadcast: Session not found');
      return 0;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    let deliveredCount = 0;

    for (const memberId of session.members) {
      if (excludeClientId && memberId === excludeClientId) {
        continue;
      }

      const client = this.connectionManager.getClient(memberId);
      if (client) {
        const isOpen = Number(client.socket.readyState) === 1 || Number(client.socket.readyState) === WebSocket.OPEN;
        if (isOpen) {
          try {
            client.socket.send(payload);
            deliveredCount++;
          } catch (error) {
            this.logger.error({ clientId: memberId, sessionId, error }, 'Failed to send session message to member');
          }
        }
      }
    }

    this.logger.info(
      { sessionId, deliveredCount, memberCount: session.members.size, excludedClient: excludeClientId },
      'Session message broadcast complete'
    );

    return deliveredCount;
  }

  public broadcastToUser(clientId: string, message: string | object): boolean {
    return this.sendToClient(clientId, message);
  }

  public broadcastToOwner(sessionId: string, message: string | object): boolean {
    if (!this.sessionManager) {
      return false;
    }
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return false;
    }
    return this.sendToClient(session.ownerId, message);
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

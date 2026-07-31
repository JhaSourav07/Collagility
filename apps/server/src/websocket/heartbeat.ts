import type { ConnectionManager } from './client.js';
import type { Broadcaster } from './broadcaster.js';
import type { ServerLogger } from '../logger/logger.js';
import { createDisconnectedEvent } from './events.js';

export class HeartbeatManager {
  private connectionManager: ConnectionManager;
  private broadcaster: Broadcaster;
  private logger: ServerLogger;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(
    connectionManager: ConnectionManager,
    broadcaster: Broadcaster,
    logger: ServerLogger,
    intervalMs = 30000
  ) {
    this.connectionManager = connectionManager;
    this.broadcaster = broadcaster;
    this.logger = logger;
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.checkConnections();
    }, this.intervalMs);

    this.logger.info({ intervalMs: this.intervalMs }, 'HeartbeatManager started');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.info('HeartbeatManager stopped');
    }
  }

  public handlePong(clientId: string): void {
    const client = this.connectionManager.getClient(clientId);
    if (client) {
      client.isAlive = true;
    }
  }

  public checkConnections(): void {
    const clients = this.connectionManager.getAllClients();

    for (const client of clients) {
      if (!client.isAlive) {
        this.logger.warn({ clientId: client.id }, 'Client dead connection detected, terminating socket');

        try {
          client.socket.terminate();
        } catch (error) {
          this.logger.error({ clientId: client.id, error }, 'Error terminating dead client socket');
        }

        this.connectionManager.removeClient(client.id);

        const disconnectEvent = createDisconnectedEvent(client.id, 'heartbeat_timeout');
        this.broadcaster.broadcast(disconnectEvent);
      } else {
        client.isAlive = false;

        if (client.socket.readyState === client.socket.OPEN) {
          try {
            client.socket.ping();
          } catch (error) {
            this.logger.error({ clientId: client.id, error }, 'Failed to send ping to client');
          }
        }
      }
    }
  }
}

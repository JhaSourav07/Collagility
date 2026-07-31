import { describe, it, expect, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionManager } from './client.js';
import { Broadcaster } from './broadcaster.js';
import { HeartbeatManager } from './heartbeat.js';
import { logger } from '../logger/logger.js';

describe('HeartbeatManager', () => {
  const createMockSocket = (): WebSocket =>
    ({
      readyState: 1,
      ping: vi.fn(),
      terminate: vi.fn(),
      send: vi.fn(),
      OPEN: 1,
    }) as unknown as WebSocket;

  it('should ping alive clients and set isAlive to false for next round', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);
    const heartbeatManager = new HeartbeatManager(connectionManager, broadcaster, logger, 1000);

    const socket = createMockSocket();
    const client = connectionManager.registerClient(socket);

    expect(client.isAlive).toBe(true);

    heartbeatManager.checkConnections();

    expect(socket.ping).toHaveBeenCalled();
    expect(client.isAlive).toBe(false);
  });

  it('should restore isAlive state when handlePong is called', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);
    const heartbeatManager = new HeartbeatManager(connectionManager, broadcaster, logger, 1000);

    const socket = createMockSocket();
    const client = connectionManager.registerClient(socket);
    client.isAlive = false;

    heartbeatManager.handlePong(client.id);

    expect(client.isAlive).toBe(true);
  });

  it('should terminate dead connection if isAlive remains false', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);
    const heartbeatManager = new HeartbeatManager(connectionManager, broadcaster, logger, 1000);

    const socket = createMockSocket();
    const client = connectionManager.registerClient(socket);
    client.isAlive = false; // Simulated unresponsive client

    heartbeatManager.checkConnections();

    expect(socket.terminate).toHaveBeenCalled();
    expect(connectionManager.getClient(client.id)).toBeUndefined();
  });
});

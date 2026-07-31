import { describe, it, expect, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionManager } from './client.js';
import { logger } from '../logger/logger.js';

describe('ConnectionManager', () => {
  const createMockSocket = (readyState = 1): WebSocket =>
    ({
      readyState,
      close: vi.fn(),
    }) as unknown as WebSocket;

  it('should register a new client and generate a unique UUID', () => {
    const manager = new ConnectionManager(logger);
    const mockSocket = createMockSocket();

    const client = manager.registerClient(mockSocket);

    expect(client.id).toBeDefined();
    expect(typeof client.id).toBe('string');
    expect(manager.getClientCount()).toBe(1);
    expect(manager.getClient(client.id)).toEqual(client);
  });

  it('should remove an existing client by ID', () => {
    const manager = new ConnectionManager(logger);
    const mockSocket = createMockSocket();
    const client = manager.registerClient(mockSocket);

    const removed = manager.removeClient(client.id);

    expect(removed).toBe(true);
    expect(manager.getClientCount()).toBe(0);
    expect(manager.getClient(client.id)).toBeUndefined();
  });

  it('should return false when removing a non-existent client', () => {
    const manager = new ConnectionManager(logger);
    const removed = manager.removeClient('non-existent-id');
    expect(removed).toBe(false);
  });

  it('should clear all clients and close active sockets during shutdown', () => {
    const manager = new ConnectionManager(logger);
    const socket1 = createMockSocket(1);
    const socket2 = createMockSocket(1);

    manager.registerClient(socket1);
    manager.registerClient(socket2);

    expect(manager.getClientCount()).toBe(2);

    manager.clearAll();

    expect(socket1.close).toHaveBeenCalledWith(1001, 'Server shutting down');
    expect(socket2.close).toHaveBeenCalledWith(1001, 'Server shutting down');
    expect(manager.getClientCount()).toBe(0);
  });
});

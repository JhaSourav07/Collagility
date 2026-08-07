import { describe, it, expect, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionManager } from './client.js';
import { Broadcaster } from './broadcaster.js';
import { logger } from '../logger/logger.js';

describe('Broadcaster', () => {
  const createMockSocket = (readyState = 1): WebSocket =>
    ({
      readyState,
      send: vi.fn(),
      OPEN: 1,
    }) as unknown as WebSocket;

  it('should broadcast message to all connected open clients', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);

    const socket1 = createMockSocket();
    const socket2 = createMockSocket();

    connectionManager.registerClient(socket1);
    connectionManager.registerClient(socket2);

    const count = broadcaster.broadcast({ type: 'test', payload: 'hello' });

    expect(count).toBe(2);
    expect(socket1.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', payload: 'hello' }));
    expect(socket2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', payload: 'hello' }));
  });

  it('should exclude specified sender client during broadcast', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);

    const socket1 = createMockSocket();
    const socket2 = createMockSocket();

    const client1 = connectionManager.registerClient(socket1);
    connectionManager.registerClient(socket2);

    const count = broadcaster.broadcast({ type: 'chat', payload: 'msg' }, client1.id);

    expect(count).toBe(1);
    expect(socket1.send).not.toHaveBeenCalled();
    expect(socket2.send).toHaveBeenCalledWith(JSON.stringify({ type: 'chat', payload: 'msg' }));
  });

  it('should send targeted message to single client ID', () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);

    const socket = createMockSocket();
    const client = connectionManager.registerClient(socket);

    const sent = broadcaster.sendToClient(client.id, { type: 'ping' });

    expect(sent).toBe(true);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('should broadcast TERMINAL_SCREEN_STREAM strictly to session members excluding the sender', async () => {
    const connectionManager = new ConnectionManager(logger);
    const broadcaster = new Broadcaster(connectionManager, logger);

    const socketHost = createMockSocket();
    const socketVisitor1 = createMockSocket();
    const socketVisitor2 = createMockSocket();

    const clientHost = connectionManager.registerClient(socketHost);
    const clientVisitor1 = connectionManager.registerClient(socketVisitor1);
    const clientVisitor2 = connectionManager.registerClient(socketVisitor2);

    const mockSessionManager = {
      getSession: vi.fn().mockResolvedValue({
        id: 'sess-abc',
        ownerId: clientHost.id,
        members: new Set([clientHost.id, clientVisitor1.id, clientVisitor2.id]),
      }),
    } as any;

    broadcaster.setSessionManager(mockSessionManager);

    const screenPayload = {
      type: 'terminal.screen.stream',
      sessionId: 'sess-abc',
      payload: {
        sessionId: 'sess-abc',
        senderId: clientHost.id,
        pane: 'right',
        data: '\x1b[32mStreaming live PTY\x1b[0m',
        timestamp: Date.now(),
      },
    };

    const count = await broadcaster.broadcastToSession('sess-abc', screenPayload, clientHost.id);

    expect(count).toBe(2);
    expect(socketHost.send).not.toHaveBeenCalled();
    expect(socketVisitor1.send).toHaveBeenCalledWith(JSON.stringify(screenPayload));
    expect(socketVisitor2.send).toHaveBeenCalledWith(JSON.stringify(screenPayload));
  });
});

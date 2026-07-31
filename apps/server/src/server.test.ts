import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { buildServer, type ServerInstance } from './server.js';

describe('Server & WebSocket Integration', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;

  beforeAll(async () => {
    serverInstance = buildServer();
    // Listen on random port for testing
    const address = await serverInstance.listen(0, '127.0.0.1');
    const port = (serverInstance.app.server.address() as { port: number }).port;
    serverUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterAll(async () => {
    await serverInstance.close();
  });

  it('should respond to HTTP GET /health with status ok and client count', async () => {
    const response = await serverInstance.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('collagility-server');
    expect(typeof body.activeClients).toBe('number');
  });

  it('should accept WebSocket connection, assign client ID, and handle ping frame', async () => {
    const clientSocket = new WebSocket(serverUrl);

    const connectionPromise = new Promise<any>((resolve) => {
      clientSocket.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'system.connected') {
          resolve(frame);
        }
      });
    });

    const connectedFrame = await connectionPromise;
    expect(connectedFrame.type).toBe('system.connected');
    expect(connectedFrame.payload.clientId).toBeDefined();
    expect(serverInstance.connectionManager.getClientCount()).toBe(1);

    // Test system ping message
    const pongPromise = new Promise<any>((resolve) => {
      clientSocket.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'system.pong') {
          resolve(frame);
        }
      });
    });

    clientSocket.send(JSON.stringify({ type: 'ping' }));
    const pongFrame = await pongPromise;
    expect(pongFrame.type).toBe('system.pong');

    // Clean up socket
    clientSocket.close();
  });

  it('should reject invalid non-JSON packet with error frame', async () => {
    const clientSocket = new WebSocket(serverUrl);

    await new Promise<void>((resolve) => {
      clientSocket.on('open', () => resolve());
    });

    const errorPromise = new Promise<any>((resolve) => {
      clientSocket.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'system.error') {
          resolve(frame);
        }
      });
    });

    clientSocket.send('invalid non json payload');
    const errorFrame = await errorPromise;

    expect(errorFrame.type).toBe('system.error');
    expect(errorFrame.payload.error).toContain('Invalid JSON structure');

    clientSocket.close();
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { buildServer, type ServerInstance } from './server.js';

describe('Server & Session Integration', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;

  beforeAll(async () => {
    serverInstance = buildServer();
    await serverInstance.listen(0, '127.0.0.1');
    const port = (serverInstance.app.server.address() as { port: number }).port;
    serverUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterAll(async () => {
    await serverInstance.close();
  });

  it('should respond to HTTP GET /health with status ok and session count', async () => {
    const response = await serverInstance.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('collagility-server');
    expect(typeof body.activeSessions).toBe('number');
  });

  it('should allow owner to create a session, peer to join, and broadcast session-scoped messages', async () => {
    const client1 = new WebSocket(serverUrl);
    const client2 = new WebSocket(serverUrl);

    // Wait for client1 connected
    const c1Connected = await new Promise<any>((resolve) => {
      client1.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'system.connected') resolve(frame);
      });
    });

    // Wait for client2 connected
    const c2Connected = await new Promise<any>((resolve) => {
      client2.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'system.connected') resolve(frame);
      });
    });

    expect(c1Connected.payload.clientId).toBeDefined();
    expect(c2Connected.payload.clientId).toBeDefined();

    // Client 1 creates session
    const sessionCreatedPromise = new Promise<any>((resolve) => {
      client1.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'session.created') resolve(frame);
      });
    });

    client1.send(JSON.stringify({ type: 'session.create' }));
    const createdFrame = await sessionCreatedPromise;
    expect(createdFrame.type).toBe('session.created');
    const sessionId = createdFrame.payload.session.id;
    expect(sessionId).toBeDefined();

    // Client 2 joins session
    const sessionJoinedPromise = new Promise<any>((resolve) => {
      client2.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'session.joined') resolve(frame);
      });
    });

    client2.send(JSON.stringify({ type: 'session.join', payload: { sessionId } }));
    const joinedFrame = await sessionJoinedPromise;
    expect(joinedFrame.type).toBe('session.joined');
    expect(joinedFrame.payload.session.members.length).toBe(2);

    // Test session-scoped chat broadcast to peer
    const peerChatPromise = new Promise<any>((resolve) => {
      client2.on('message', (data) => {
        const frame = JSON.parse(data.toString('utf-8'));
        if (frame.type === 'chat') resolve(frame);
      });
    });

    client1.send(JSON.stringify({ type: 'chat', payload: { text: 'Session scoped message' } }));
    const peerFrame = await peerChatPromise;
    expect(peerFrame.payload.text).toBe('Session scoped message');

    client1.close();
    client2.close();
  });
});

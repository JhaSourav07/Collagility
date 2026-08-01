import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer, type ServerInstance } from '@collagility/server';
import { WebSocketClient } from '../client/ws-client.js';
import { createConfig } from '../config/config.js';
import { StreamManager, createStreamChunk } from '@collagility/stream';

describe('AI Lifecycle & Consecutive Prompt Regression Test', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;

  beforeEach(async () => {
    serverInstance = buildServer();
    await serverInstance.listen(0, '127.0.0.1');
    const port = (serverInstance.app.server.address() as { port: number }).port;
    serverUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterEach(async () => {
    await serverInstance.close();
  });

  it('should transition stream from Streaming -> Completed -> Idle and process consecutive prompts without restarting CLI', async () => {
    const streamManager = new StreamManager();
    const sessionId = 'lifecycle-session-001';
    const ownerId = 'owner-user';

    // 1. Prompt 1 Start
    const stream1 = streamManager.startStream({
      sessionId,
      ownerId,
      prompt: '@agi say hi',
      adapterName: 'mock',
    });

    expect(streamManager.isStreamActive(sessionId)).toBe(true);

    // 2. Stream chunk starting at seq 0 with isFinal: true
    const finalChunk = createStreamChunk({
      streamId: stream1.streamId,
      sequenceNumber: 0,
      sessionId,
      sender: { id: 'mock', name: 'mock', role: 'ai' },
      content: 'Hello! I am AI.',
      isFinal: true,
    });

    streamManager.handleChunk(sessionId, finalChunk);

    // 3. Verify stream1 transitioned to Completed and cleaned up to Idle
    expect(streamManager.isStreamActive(sessionId)).toBe(false);

    // 4. Prompt 2 Start (MUST work without throwing "already has an active AI stream")
    const stream2 = streamManager.startStream({
      sessionId,
      ownerId,
      prompt: '@agi tell me a joke',
      adapterName: 'mock',
    });

    expect(stream2.streamId).not.toBe(stream1.streamId);
    expect(streamManager.isStreamActive(sessionId)).toBe(true);

    // 5. Complete Prompt 2
    streamManager.completeStream(sessionId);
    expect(streamManager.isStreamActive(sessionId)).toBe(false);
  });
});

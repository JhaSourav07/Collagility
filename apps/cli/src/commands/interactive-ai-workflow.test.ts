import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer, type ServerInstance } from '@collagility/server';
import { WebSocketClient } from '../client/ws-client.js';
import { createConfig } from '../config/config.js';
import { StreamManager } from '@collagility/stream';
import { MockAIAdapter } from '@collagility/adapters';

describe('Interactive AI Workflow Integration', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;

  beforeEach(async () => {
    serverInstance = buildServer();
    const address = await serverInstance.listen(0, '127.0.0.1');
    const port = (serverInstance.app.server.address() as { port: number }).port;
    serverUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterEach(async () => {
    await serverInstance.close();
  });

  it('should process bidirectional questions, plans, confirmations and tool approvals', async () => {
    const ownerClient = new WebSocketClient(createConfig({
      serverUrl,
      maxReconnectAttempts: 1,
      reconnectIntervalMs: 100,
    }));

    const memberClient = new WebSocketClient(createConfig({
      serverUrl,
      maxReconnectAttempts: 1,
      reconnectIntervalMs: 100,
    }));

    await ownerClient.connect();
    await memberClient.connect();

    let createdSessionId = '';
    let ownerJoined = false;
    let memberReceivedPlan = false;
    let memberReceivedQuestion = false;

    // Set up owner session creation
    ownerClient.createSession();
    await new Promise<void>((resolve) => {
      ownerClient['events'].onSessionCreated = (session) => {
        createdSessionId = String(session['id']);
        ownerJoined = true;
        resolve();
      };
    });

    expect(ownerJoined).toBe(true);
    expect(createdSessionId).toBeTruthy();

    // Join member client
    memberClient.joinSession(createdSessionId);
    await new Promise<void>((resolve) => {
      memberClient['events'].onSessionJoined = () => resolve();
    });

    // Subscribe member to interactive events
    memberClient['events'].onPlan = (payload) => {
      if (payload.title === 'Refactor Monorepo Structure') {
        memberReceivedPlan = true;
      }
    };

    memberClient['events'].onQuestion = (payload) => {
      if (payload.prompt.includes('Which framework')) {
        memberReceivedQuestion = true;
      }
    };

    // Owner broadcasts interactive AI Plan
    ownerClient.send('ai.plan', {
      planId: 'plan-101',
      streamId: 'stream-1',
      title: 'Refactor Monorepo Structure',
      steps: ['Create package', 'Migrate code', 'Run tests'],
      requiresApproval: true,
    });

    // Owner broadcasts interactive AI Question
    ownerClient.send('ai.question', {
      questionId: 'q-101',
      streamId: 'stream-1',
      prompt: 'Which framework would you like to use?',
      options: ['Next.js', 'Vite'],
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(memberReceivedPlan).toBe(true);
    expect(memberReceivedQuestion).toBe(true);

    // Owner approves plan & answers question
    let planApprovedBroadcast = false;
    let questionAnswerBroadcast = false;

    memberClient['events'].onFrame = (frame) => {
      if (frame.type === 'ai.plan.approve') {
        planApprovedBroadcast = true;
      }
      if (frame.type === 'ai.answer') {
        questionAnswerBroadcast = true;
      }
    };

    ownerClient.send('ai.plan.approve', { planId: 'plan-101', streamId: 'stream-1' });
    ownerClient.send('ai.answer', { questionId: 'q-101', streamId: 'stream-1', answer: 'Next.js' });

    await new Promise((r) => setTimeout(r, 200));

    expect(planApprovedBroadcast).toBe(true);
    expect(questionAnswerBroadcast).toBe(true);

    ownerClient.disconnect();
    memberClient.disconnect();
  });

  it('should clean up completed stream state and support consecutive AI prompts', async () => {
    const streamManager = new StreamManager();
    const sessionId = 'test-session-multi-prompt';
    const ownerId = 'owner-123';

    // First stream
    const stream1 = streamManager.startStream({
      sessionId,
      ownerId,
      prompt: 'First Prompt',
      adapterName: 'mock',
    });

    expect(streamManager.isStreamActive(sessionId)).toBe(true);

    // Complete first stream
    streamManager.completeStream(sessionId);

    // Verify stream is no longer active and cleaned up
    expect(streamManager.isStreamActive(sessionId)).toBe(false);

    // Second stream must succeed without throwing STREAM_ALREADY_ACTIVE
    const stream2 = streamManager.startStream({
      sessionId,
      ownerId,
      prompt: 'Second Prompt',
      adapterName: 'mock',
    });

    expect(stream2.streamId).not.toBe(stream1.streamId);
    expect(streamManager.isStreamActive(sessionId)).toBe(true);

    streamManager.completeStream(sessionId);
    expect(streamManager.isStreamActive(sessionId)).toBe(false);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { parseCLIInput } from '../terminal/command-parser.js';
import { GeminiHealthChecker, GeminiAIAdapter } from '@collagility/adapters';
import { StreamManager } from '@collagility/stream';
import { EVENT_TYPES } from '@collagility/protocol';

describe('Milestone 9 End-to-End AI Integration', () => {
  it('should verify Gemini CLI health check structured info without requesting API keys', async () => {
    const checker = new GeminiHealthChecker('gemini', true);
    const health = await checker.checkDetailedHealth();

    expect(health.ok).toBe(true);
    expect(health.authenticated).toBe(true);
    expect(health.version).toBeDefined();
    expect(health.executable).toContain('gemini');
  });

  it('should parse @gemini AI prompts vs standard chat input', () => {
    const aiInput = parseCLIInput('@gemini Explain Rust ownership');
    expect(aiInput).toEqual({
      type: 'ai',
      adapterName: 'gemini',
      prompt: 'Explain Rust ownership',
    });

    const chatInput = parseCLIInput('Hello team');
    expect(chatInput).toEqual({
      type: 'chat',
      text: 'Hello team',
    });
  });

  it('should execute end-to-end AI prompt streaming from owner adapter to session participants', async () => {
    // 1. Setup StreamManager on Server
    const serverStreamManager = new StreamManager();
    const serverEvents: any[] = [];
    serverStreamManager.on('streamEvent', (evt) => serverEvents.push(evt));

    // 2. Owner starts stream on server
    const activeStream = serverStreamManager.startStream({
      sessionId: 'test-session-1',
      ownerId: 'owner-client-id',
      prompt: 'Explain promises',
      adapterName: 'gemini',
    });

    expect(activeStream.streamId).toBeDefined();
    expect(serverStreamManager.isStreamActive('test-session-1')).toBe(true);

    // 3. Initialize Owner local GeminiAIAdapter (mock mode)
    const mockProcess = {
      stdout: { emit: vi.fn() },
      stderr: { emit: vi.fn() },
      stdin: { write: vi.fn() },
      killed: false,
      exitCode: null,
      kill: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    } as any;

    const ownerAdapter = new GeminiAIAdapter({
      mockMode: true,
      mockProcessFactory: () => mockProcess,
    });
    await ownerAdapter.initialize();

    // 4. Simulate streaming chunks from owner adapter to server
    serverStreamManager.handleRawChunk('test-session-1', 'Promises represent ');
    serverStreamManager.handleRawChunk('test-session-1', 'eventual completion.\n', true);

    // 5. Verify server stream manager generated AI stream events for participants
    const started = serverEvents.find((e) => e.type === EVENT_TYPES.AI_STREAM_STARTED);
    const chunks = serverEvents.filter((e) => e.type === EVENT_TYPES.AI_STREAM_CHUNK);
    const completed = serverEvents.find((e) => e.type === EVENT_TYPES.AI_STREAM_COMPLETED);

    expect(started).toBeDefined();
    expect(chunks).toHaveLength(2);
    expect(chunks[0].payload.content).toBe('Promises represent ');
    expect(chunks[1].payload.content).toBe('eventual completion.\n');
    expect(completed).toBeDefined();
    expect(completed.payload.fullResponse).toBe('Promises represent eventual completion.\n');

    await ownerAdapter.dispose();
  });
});

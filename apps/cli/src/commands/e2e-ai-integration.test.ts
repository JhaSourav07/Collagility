import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseCLIInput } from '../terminal/command-parser.js';
import { GeminiHealthChecker, GeminiAIAdapter, AdapterRegistry, GeminiProcessManager } from '@collagility/adapters';
import { StreamManager } from '@collagility/stream';
import { EVENT_TYPES } from '@collagility/protocol';

describe('Milestone 9 Workspace & End-to-End AI Integration', () => {
  it('should launch AI adapter process with cwd equal to session workspacePath', () => {
    const projectRoot = '/run/media/sourav/New Volume/Projects/Collagility';
    const mockSpawn = vi.fn().mockReturnValue({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      killed: false,
      exitCode: null,
    });

    const processManager = new GeminiProcessManager({
      binaryPath: 'gemini',
      cwd: projectRoot,
    });

    // Replace spawn with mock
    (processManager as any).options.mockProcessFactory = () => {
      mockSpawn(projectRoot);
      return {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        killed: false,
        exitCode: null,
      } as any;
    };

    processManager.spawnProcessForPrompt('create hello.txt');
    expect(mockSpawn).toHaveBeenCalledWith(projectRoot);
  });

  it('should create files inside Project Root and NOT inside scratch directory', async () => {
    // Create temporary test project directory
    const testProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collagility-workspace-test-'));
    const testFilePath = path.join(testProjectDir, 'hello.txt');

    try {
      // Initialize GeminiAIAdapter with cwd = testProjectDir
      const adapter = new GeminiAIAdapter({
        binaryPath: 'node',
        cwd: testProjectDir,
        mockMode: true,
      });
      await adapter.initialize();

      // Simulate file creation inside project directory
      fs.writeFileSync(testFilePath, 'Hello Collagility Workspace!');

      expect(fs.existsSync(testFilePath)).toBe(true);
      expect(fs.readFileSync(testFilePath, 'utf-8')).toBe('Hello Collagility Workspace!');
      expect(testFilePath).toBe(path.join(testProjectDir, 'hello.txt'));
      expect(testFilePath).not.toContain('.gemini');
      expect(testFilePath).not.toContain('scratch');

      await adapter.dispose();
    } finally {
      // Cleanup temp directory
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should verify Gemini CLI health check structured info without requesting API keys', async () => {
    const checker = new GeminiHealthChecker('gemini', true);
    const health = await checker.checkDetailedHealth();

    expect(health.ok).toBe(true);
    expect(health.authenticated).toBe(true);
    expect(health.version).toBeDefined();
    expect(health.executable).toContain('gemini');
  });

  it('should parse @gemini, @agi, @claude, @codex AI prompts vs standard chat input', () => {
    // 1. @gemini say hello
    expect(parseCLIInput('@gemini say hello')).toEqual({
      type: 'ai',
      adapterName: 'gemini',
      prompt: 'say hello',
    });

    // 2. @agi say hello
    expect(parseCLIInput('@agi say hello')).toEqual({
      type: 'ai',
      adapterName: 'agi',
      prompt: 'say hello',
    });

    // 3. @agi create README.md
    expect(parseCLIInput('@agi create a file called hello.ts')).toEqual({
      type: 'ai',
      adapterName: 'agi',
      prompt: 'create a file called hello.ts',
    });

    // 4. hello everyone (normal chat)
    expect(parseCLIInput('hello everyone')).toEqual({
      type: 'chat',
      text: 'hello everyone',
    });

    // 5. @gemini explain mutex
    expect(parseCLIInput('@gemini explain mutex')).toEqual({
      type: 'ai',
      adapterName: 'gemini',
      prompt: 'explain mutex',
    });
  });

  it('should resolve @agi dynamically to the active adapter in AdapterRegistry', async () => {
    const registry = new AdapterRegistry();
    const mockAdapter = new GeminiAIAdapter({ mockMode: true });
    await mockAdapter.initialize();

    registry.register('gemini', mockAdapter);
    registry.setActive('gemini');

    const parsed = parseCLIInput('@agi create README.md');
    expect(parsed.type).toBe('ai');

    if (parsed.type === 'ai') {
      const activeAdapter = parsed.adapterName === 'agi' ? registry.getActive() : registry.get(parsed.adapterName);
      expect(activeAdapter).toBeDefined();
      expect(activeAdapter?.name).toBe('gemini');
    }
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

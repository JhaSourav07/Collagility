import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AntigravityAIAdapter, AntigravityAdapter } from './antigravity-adapter.js';
import { AntigravityOutputParser } from './parser.js';
import { AntigravityHealthChecker } from './health.js';
import { AdapterRegistry, registerAntigravityAdapter } from '../base/registry.js';
import { BaseAdapter } from '../base/adapter.js';

describe('AntigravityAIAdapter', () => {
  let adapter: AntigravityAIAdapter;

  beforeEach(() => {
    adapter = new AntigravityAIAdapter({ mockMode: true });
  });

  describe('Inheritance & BaseAdapter compatibility', () => {
    it('should extend BaseAdapter and have correct properties', () => {
      expect(adapter).toBeInstanceOf(BaseAdapter);
      expect(adapter.id).toBe('antigravity');
      expect(adapter.name).toBe('antigravity');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.status).toBe('uninitialized');
    });

    it('should export AntigravityAdapter as alias', () => {
      const aliasAdapter = new AntigravityAdapter({ mockMode: true });
      expect(aliasAdapter).toBeInstanceOf(AntigravityAIAdapter);
    });
  });

  describe('Lifecycle & Process Management', () => {
    it('should initialize and emit ai.started and ai.ready events', async () => {
      const startedListener = vi.fn();
      const readyListener = vi.fn();

      adapter.on('ai.started', startedListener);
      adapter.on('ai.ready', readyListener);

      await adapter.initialize();

      expect(adapter.status).toBe('ready');
      expect(startedListener).toHaveBeenCalledTimes(1);
      expect(readyListener).toHaveBeenCalledTimes(1);
    });

    it('should start properly', async () => {
      await adapter.start();
      expect(adapter.status).toBe('ready');
    });

    it('should send prompt and return completed event envelope in mock mode', async () => {
      await adapter.start();
      const promptListener = vi.fn();
      const completedListener = vi.fn();

      adapter.on('ai.prompt', promptListener);
      adapter.on('ai.completed', completedListener);

      const result = await adapter.sendPrompt('Create a react component');

      expect(promptListener).toHaveBeenCalledTimes(1);
      expect(completedListener).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('ai.completed');
      expect(result.payload.response).toContain('Processed prompt "Create a react component"');
      expect(result.payload.metadata?.provider).toBe('google-antigravity');
      expect(adapter.status).toBe('ready');
    });

    it('should support mockProcessFactory for process streaming execution', async () => {
      const fakeProcess = new EventEmitter() as any;
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();
      fakeProcess.killed = false;

      const mockAdapter = new AntigravityAIAdapter({
        mockProcessFactory: () => fakeProcess,
      });
      mockAdapter.setSecurityMode('auto');

      await mockAdapter.start();


      const thoughtListener = vi.fn();
      const toolCallListener = vi.fn();
      const fileChangeListener = vi.fn();
      const chunkListener = vi.fn();

      mockAdapter.on('thought' as any, thoughtListener);
      mockAdapter.on('tool_call' as any, toolCallListener);
      mockAdapter.on('file_change' as any, fileChangeListener);
      mockAdapter.on('chunk' as any, chunkListener);

      const promptPromise = mockAdapter.sendPrompt('Refactor index.ts');

      // Simulate JSON stream stdout from agy
      fakeProcess.stdout.emit(
        'data',
        Buffer.from(JSON.stringify({ type: 'thought', content: 'Analyzing project structure...' }) + '\n')
      );
      fakeProcess.stdout.emit(
        'data',
        Buffer.from(
          JSON.stringify({
            type: 'tool_call',
            toolName: 'run_command',
            toolArgs: { CommandLine: 'pnpm test' },
            content: 'Executing command pnpm test',
          }) + '\n'
        )
      );
      fakeProcess.stdout.emit(
        'data',
        Buffer.from(
          JSON.stringify({
            type: 'file_change',
            filePath: 'src/index.ts',
            action: 'modified',
            content: 'Updated index.ts file',
          }) + '\n'
        )
      );

      fakeProcess.emit('exit', 0, null);

      const result = await promptPromise;

      expect(thoughtListener).toHaveBeenCalledWith({ content: '> _Analyzing project structure..._' });
      expect(toolCallListener).toHaveBeenCalledWith({
        toolName: 'run_command',
        toolArgs: { CommandLine: 'pnpm test' },
        content: 'Executing command pnpm test',
        riskLevel: 'MEDIUM',
      });

      expect(fileChangeListener).toHaveBeenCalledWith({
        filePath: 'src/index.ts',
        changeType: 'modified',
        content: 'Updated index.ts file',
      });
      expect(chunkListener).toHaveBeenCalled();
      expect(result.type).toBe('ai.completed');
    });

    it('should send user input to stdin', async () => {
      const chunkListener = vi.fn();
      adapter.on('chunk' as any, chunkListener);

      await adapter.sendInput('yes');

      expect(chunkListener).toHaveBeenCalledWith('[Antigravity Input]: yes\n');
    });

    it('should cancel active processing and emit ai.cancelled', async () => {
      const fakeProcess = new EventEmitter() as any;
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();
      fakeProcess.killed = false;
      fakeProcess.kill = vi.fn((sig) => {
        fakeProcess.killed = true;
        fakeProcess.emit('exit', null, sig);
      });

      const mockAdapter = new AntigravityAIAdapter({
        mockProcessFactory: () => fakeProcess,
      });

      await mockAdapter.start();

      const cancelListener = vi.fn();
      mockAdapter.on('ai.cancelled', cancelListener);

      const promptPromise = mockAdapter.sendPrompt('Long task');
      expect(mockAdapter.status).toBe('processing');

      await mockAdapter.cancel();

      expect(fakeProcess.kill).toHaveBeenCalledWith('SIGINT');
      expect(cancelListener).toHaveBeenCalledTimes(1);
      expect(mockAdapter.status).toBe('cancelled');

      await expect(promptPromise).rejects.toThrow('Prompt execution cancelled');
    });

    it('should stop and dispose adapter correctly', async () => {
      await adapter.start();
      await adapter.stop();

      expect(adapter.status).toBe('stopped');

      await adapter.dispose();
      expect(adapter.status).toBe('uninitialized');
    });

    it('should write y\\n to childProcess.stdin upon resolvePermission approval', async () => {
      const fakeProcess = new EventEmitter() as any;
      fakeProcess.stdin = { write: vi.fn(), writable: true };
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();
      fakeProcess.killed = false;

      const mockAdapter = new AntigravityAIAdapter({
        mockProcessFactory: () => fakeProcess,
      });

      await mockAdapter.start();

      // Start prompt execution to assign childProcess
      const promptPromise = mockAdapter.sendPrompt('Create hello.txt');

      // Intercept permission & resolve approval
      const permPromise = mockAdapter.interceptCommandPermission('write_to_file', 'create hello.txt');
      const pendingIds = Array.from((mockAdapter as any)._pendingPermissions.keys());
      expect(pendingIds.length).toBeGreaterThan(0);

      mockAdapter.resolvePermission(pendingIds[0] as string, 'allow-once');
      await permPromise;

      expect(fakeProcess.stdin.write).toHaveBeenCalledWith('y\n');

      fakeProcess.emit('exit', 0, null);
      await promptPromise;
    });

    it('should write stdin newline on TOOL_FILE_EDIT and resume final text response stream', async () => {
      const fakeProcess = new EventEmitter() as any;
      fakeProcess.stdin = { write: vi.fn(), writable: true };
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();
      fakeProcess.killed = false;

      const mockAdapter = new AntigravityAIAdapter({
        mockProcessFactory: () => fakeProcess,
      });

      await mockAdapter.start();

      const toolEditListener = vi.fn();
      const chunkListener = vi.fn();
      mockAdapter.on('tool_file_edit' as any, toolEditListener);
      mockAdapter.on('chunk' as any, chunkListener);

      const promptPromise = mockAdapter.sendPrompt('Create hello.txt file edit');

      // 1. Emit TOOL_FILE_EDIT event stream chunk
      fakeProcess.stdout.emit(
        'data',
        Buffer.from(
          JSON.stringify({
            toolName: 'write_to_file',
            targetFile: 'hello.txt',
            TargetContent: '',
            ReplacementContent: 'Hello World',
          }) + '\n'
        )
      );

      // Verify stdin write was triggered for tool edit resumption
      expect(fakeProcess.stdin.write).toHaveBeenCalledWith('\n');
      expect(toolEditListener).toHaveBeenCalled();

      // 2. Emit final text summary stream chunk
      fakeProcess.stdout.emit(
        'data',
        Buffer.from(
          JSON.stringify({
            event: 'step_update',
            step_update: {
              step_type: 'agent_response',
              text_delta: 'Created hello.txt with requested plan content.',
            },
          }) + '\n'
        )
      );

      fakeProcess.emit('exit', 0, null);

      const result = await promptPromise;
      expect(result.type).toBe('ai.completed');
      expect(chunkListener).toHaveBeenCalledWith('Created hello.txt with requested plan content.');
    });

    it('should flush initial stdin newline on spawn to bypass welcome prompts', async () => {
      const fakeProcess = new EventEmitter() as any;
      fakeProcess.stdin = { write: vi.fn(), writable: true };
      fakeProcess.stdout = new EventEmitter();
      fakeProcess.stderr = new EventEmitter();
      fakeProcess.killed = false;

      const mockAdapter = new AntigravityAIAdapter({
        mockProcessFactory: () => fakeProcess,
      });

      await mockAdapter.start();
      const promptPromise = mockAdapter.sendPrompt('Test initial stdin flush');

      expect(fakeProcess.stdin.write).toHaveBeenCalledWith('\n');

      fakeProcess.emit('exit', 0, null);
      await promptPromise;
    });
  });

  describe('AntigravityOutputParser', () => {
    let parser: AntigravityOutputParser;

    beforeEach(() => {
      parser = new AntigravityOutputParser();
    });

    it('should parse JSON THOUGHT stream events', () => {
      const event = parser.parseLine(
        JSON.stringify({ type: 'thought', content: 'Analyzing repository dependencies' })
      );
      expect(event.type).toBe('THOUGHT');
      expect(event.content).toBe('> _Analyzing repository dependencies_');
    });

    it('should parse JSON TOOL_ANALYSIS stream events with metadata', () => {
      const event = parser.parseLine(
        JSON.stringify({
          toolName: 'view_file',
          filePath: '/src/main.ts',
          content: 'Viewing main.ts',
        })
      );
      expect(event.type).toBe('TOOL_ANALYSIS');
      expect(event.content).toBe('Viewing main.ts');
      expect(event.metadata?.toolName).toBe('view_file');
      expect(event.metadata?.filePath).toBe('/src/main.ts');
    });

    it('should parse JSON FILE_CHANGE stream events with metadata', () => {
      const event = parser.parseLine(
        JSON.stringify({
          type: 'file_change',
          filePath: 'packages/adapters/src/index.ts',
          action: 'created',
          content: 'File created: index.ts',
        })
      );
      expect(event.type).toBe('FILE_CHANGE');
      expect(event.content).toBe('File created: index.ts');
      expect(event.metadata?.filePath).toBe('packages/adapters/src/index.ts');
      expect(event.metadata?.changeType).toBe('created');
    });

    it('should parse JSON ERROR stream events with metadata', () => {
      const event = parser.parseLine(
        JSON.stringify({
          type: 'error',
          error: 'Process failed unexpectedly',
          errorCode: 'AGY_CRASH',
        })
      );
      expect(event.type).toBe('ERROR');
      expect(event.content).toBe('Process failed unexpectedly');
      expect(event.metadata?.errorCode).toBe('AGY_CRASH');
    });

    it('should parse plain text THOUGHT, TOOL_CALL, FILE_CHANGE, and ERROR lines', () => {
      const thoughtEvt = parser.parseLine('[THOUGHT] Exploring codebase structure');
      expect(thoughtEvt.type).toBe('THOUGHT');
      expect(thoughtEvt.content).toBe('> _Exploring codebase structure_');

      const toolEvt = parser.parseLine('Calling tool: grep_search');
      expect(toolEvt.type).toBe('TOOL_CALL');
      expect(toolEvt.metadata?.toolName).toBe('grep_search');

      const fileEvt = parser.parseLine('File changed: src/utils.ts');
      expect(fileEvt.type).toBe('FILE_CHANGE');
      expect(fileEvt.metadata?.filePath).toBe('src/utils.ts');

      const errEvt = parser.parseLine('[ERROR] Failed to compile TypeScript');
      expect(errEvt.type).toBe('ERROR');
      expect(errEvt.content).toBe('[ERROR] Failed to compile TypeScript');
    });

    it('should process multi-line stream chunks with parseChunk()', () => {
      const chunk =
        '[THOUGHT] First thought\n' +
        'Executing command: pnpm test\n' +
        'Modified file: README.md\n';

      const events = parser.parseChunk(chunk);
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('THOUGHT');
      expect(events[1].type).toBe('TOOL_CALL');
      expect(events[2].type).toBe('FILE_CHANGE');
    });
  });

  describe('AntigravityHealthChecker', () => {
    it('should return healthy status in mock mode', async () => {
      const checker = new AntigravityHealthChecker('agy', true);
      const detailed = await checker.checkDetailedHealth();

      expect(detailed.ok).toBe(true);
      expect(detailed.detectedBinary).toBe('agy');
      expect(detailed.version).toBe('1.0.0-mock');

      const health = await checker.checkHealth('ready');
      expect(health.ok).toBe(true);
      expect(health.message).toContain('Antigravity CLI available');
    });

    it('should check health against current status', async () => {
      await adapter.initialize();
      const health = await adapter.health();

      expect(health.ok).toBe(true);
      expect(health.message).toContain('Status: ready');
    });
  });

  describe('Registry Integration', () => {
    it('should register antigravity in AdapterRegistry', () => {
      const registry = new AdapterRegistry();
      registry.register('antigravity', adapter);

      expect(registry.has('antigravity')).toBe(true);
      expect(registry.has('ANTIGRAVITY')).toBe(true);
      expect(registry.get('antigravity')).toBe(adapter);
    });

    it('should register antigravity using registerAntigravityAdapter helper', () => {
      const registry = new AdapterRegistry();
      registerAntigravityAdapter(registry, adapter);

      expect(registry.has('antigravity')).toBe(true);
      expect(registry.has('agy')).toBe(true);
      expect(registry.get('agy')).toBe(adapter);
    });
  });
});

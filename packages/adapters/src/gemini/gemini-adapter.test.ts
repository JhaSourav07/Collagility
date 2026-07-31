import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { GeminiAIAdapter } from './gemini-adapter.js';
import { GeminiOutputParser } from './parser.js';
import { GeminiStdoutHandler } from './stdout.js';
import { GeminiStderrHandler } from './stderr.js';

function createMockChildProcess(): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;
  const stdin = new EventEmitter() as any;
  stdin.writable = true;
  stdin.write = vi.fn().mockImplementation((str: string) => {
    // Simulate Gemini stdout response when prompt is written
    setImmediate(() => {
      if (proc.stdout) {
        proc.stdout.emit('data', Buffer.from(`Refactored code snippet\n[GEMINI_COMPLETE]\n`));
      }
    });
    return true;
  });

  proc.stdin = stdin;
  proc.stdout = new EventEmitter() as any;
  proc.stderr = new EventEmitter() as any;
  proc.killed = false;
  proc.exitCode = null;
  proc.kill = vi.fn().mockImplementation((signal?: string) => {
    proc.killed = true;
    proc.exitCode = 0;
    proc.emit('exit', 0, signal || 'SIGTERM');
  });

  return proc;
}

describe('Gemini Output Parser & Stream Handlers', () => {
  it('should parse code blocks and text lines', () => {
    const parser = new GeminiOutputParser();
    expect(parser.parseLine('Hello Gemini')).toEqual({ type: 'text', content: 'Hello Gemini' });

    expect(parser.parseLine('```typescript')).toEqual({
      type: 'code',
      content: '```typescript',
      language: 'typescript',
    });

    expect(parser.parseLine('const x = 10;')).toEqual({
      type: 'code',
      content: 'const x = 10;',
      language: 'typescript',
    });

    expect(parser.parseLine('```')).toEqual({
      type: 'code',
      content: '```',
      language: 'typescript',
    });

    expect(parser.parseLine('Done text')).toEqual({ type: 'text', content: 'Done text' });
  });

  it('should handle stdout chunks and newline splitting', () => {
    const stdoutHandler = new GeminiStdoutHandler();
    const parsedChunks: any[] = [];
    stdoutHandler.onChunk((chunk) => parsedChunks.push(chunk));

    stdoutHandler.handleData(Buffer.from('Line 1\nLine 2\n[GEMINI_'));
    expect(parsedChunks).toHaveLength(2);
    expect(parsedChunks[0].content).toBe('Line 1');

    stdoutHandler.handleData(Buffer.from('COMPLETE]\n'));
    expect(parsedChunks).toHaveLength(3);
    expect(parsedChunks[2].type).toBe('completion');
  });
});

describe('Gemini Process Adapter Execution & Lifecycle', () => {
  it('should initialize and execute prompt with mock process', async () => {
    const mockProcess = createMockChildProcess();
    const adapter = new GeminiAIAdapter({
      mockProcessFactory: () => mockProcess,
    });

    const startedSpy = vi.fn();
    const readySpy = vi.fn();
    const completedSpy = vi.fn();

    adapter.on('ai.started', startedSpy);
    adapter.on('ai.ready', readySpy);
    adapter.on('ai.completed', completedSpy);

    await adapter.initialize();
    expect(adapter.status).toBe('ready');
    expect(startedSpy).toHaveBeenCalledOnce();
    expect(readySpy).toHaveBeenCalledOnce();

    const response = await adapter.sendPrompt('Optimize this function');

    expect(completedSpy).toHaveBeenCalledOnce();
    expect(response.payload.response).toContain('Refactored code snippet');
    expect(response.payload.adapterName).toBe('gemini');
    expect(adapter.status).toBe('ready');

    await adapter.dispose();
    expect(adapter.status).toBe('uninitialized');
  });

  it('should handle prompt cancellation gracefully', async () => {
    const proc = new EventEmitter() as ChildProcess;
    const stdin = new EventEmitter() as any;
    stdin.writable = true;
    stdin.write = vi.fn();
    proc.stdin = stdin;
    proc.stdout = new EventEmitter() as any;
    proc.stderr = new EventEmitter() as any;
    proc.killed = false;
    proc.exitCode = null;
    proc.kill = vi.fn().mockImplementation(() => {
      proc.killed = true;
      proc.exitCode = 0;
      proc.emit('exit', 0, 'SIGINT');
    });

    const adapter = new GeminiAIAdapter({
      mockProcessFactory: () => proc,
    });

    await adapter.initialize();

    const cancelSpy = vi.fn();
    adapter.on('ai.cancelled', cancelSpy);

    const promptPromise = adapter.sendPrompt('Slow task');
    await adapter.cancel();

    await expect(promptPromise).rejects.toThrow();
    expect(cancelSpy).toHaveBeenCalledOnce();
    expect(adapter.status).toBe('cancelled');
  });
});

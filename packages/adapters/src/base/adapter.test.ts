import { describe, it, expect, vi } from 'vitest';
import { MockAIAdapter } from '../mock/mock-adapter.js';
import { GeminiAIAdapter } from '../gemini/gemini-adapter.js';
import { ClaudeAIAdapter } from '../claude/claude-adapter.js';
import { CodexAIAdapter } from '../codex/codex-adapter.js';
import { AiderAIAdapter } from '../aider/aider-adapter.js';
import { GooseAIAdapter } from '../goose/goose-adapter.js';
import {
  AdapterInitializationError,
  AdapterExecutionError,
  AdapterCancellationError,
} from './errors.js';

describe('AIAdapter Lifecycle & Contract', () => {
  it('should initialize and emit ai.started and ai.ready events', async () => {
    const adapter = new MockAIAdapter();
    const startedListener = vi.fn();
    const readyListener = vi.fn();

    adapter.on('ai.started', startedListener);
    adapter.on('ai.ready', readyListener);

    expect(adapter.status).toBe('uninitialized');
    await adapter.initialize({ key: 'value' });

    expect(adapter.status).toBe('ready');
    expect(startedListener).toHaveBeenCalledOnce();
    expect(readyListener).toHaveBeenCalledOnce();
    expect(startedListener.mock.calls[0][0].payload.status).toBe('initializing');
    expect(readyListener.mock.calls[0][0].payload.status).toBe('ready');
  });

  it('should handle initialization failure', async () => {
    const adapter = new MockAIAdapter({ shouldFailInit: true });
    const failedListener = vi.fn();
    adapter.on('ai.failed', failedListener);

    await expect(adapter.initialize()).rejects.toThrow(AdapterInitializationError);
    expect(adapter.status).toBe('failed');
    expect(failedListener).toHaveBeenCalledOnce();
  });

  it('should process prompt and emit ai.prompt and ai.completed', async () => {
    const adapter = new MockAIAdapter({ responseDelayMs: 5 });
    await adapter.initialize();

    const promptListener = vi.fn();
    const completedListener = vi.fn();

    adapter.on('ai.prompt', promptListener);
    adapter.on('ai.completed', completedListener);

    const result = await adapter.sendPrompt('Refactor this function');

    expect(promptListener).toHaveBeenCalledOnce();
    expect(completedListener).toHaveBeenCalledOnce();
    expect(result.payload.response).toContain('Refactor this function');
    expect(result.sender?.role).toBe('ai');
    expect(adapter.status).toBe('ready');
  });

  it('should handle prompt execution failure', async () => {
    const adapter = new MockAIAdapter({ shouldFailPrompt: true, responseDelayMs: 5 });
    await adapter.initialize();

    const failedListener = vi.fn();
    adapter.on('ai.failed', failedListener);

    await expect(adapter.sendPrompt('Test fail')).rejects.toThrow(AdapterExecutionError);
    expect(adapter.status).toBe('failed');
    expect(failedListener).toHaveBeenCalledOnce();
  });

  it('should support prompt cancellation', async () => {
    const adapter = new MockAIAdapter({ responseDelayMs: 100 });
    await adapter.initialize();

    const cancelListener = vi.fn();
    adapter.on('ai.cancelled', cancelListener);

    const promptPromise = adapter.sendPrompt('Long running task');
    await adapter.cancel();

    await expect(promptPromise).rejects.toThrow(AdapterCancellationError);
    expect(adapter.status).toBe('cancelled');
    expect(cancelListener).toHaveBeenCalledOnce();
  });

  it('should verify provider adapter stubs (Gemini, Claude, Codex, Aider, Goose)', async () => {
    const adapters = [
      new GeminiAIAdapter({ mockMode: true }),
      new ClaudeAIAdapter(),
      new CodexAIAdapter(),
      new AiderAIAdapter(),
      new GooseAIAdapter(),
    ];

    for (const adapter of adapters) {
      await adapter.initialize();
      expect(adapter.status).toBe('ready');

      const health = await adapter.health();
      expect(health.ok).toBe(true);

      const response = await adapter.sendPrompt('Hello agent');
      expect(response.payload.response).toBeDefined();
      expect(response.sender?.name).toBe(adapter.name);

      await adapter.dispose();
      expect(adapter.status).toBe('uninitialized');
    }
  });
});

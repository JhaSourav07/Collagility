import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry } from './registry.js';
import { MockAIAdapter } from '../mock/mock-adapter.js';
import { GeminiAIAdapter } from '../gemini/gemini-adapter.js';
import { ClaudeAIAdapter } from '../claude/claude-adapter.js';
import { AdapterError, AdapterInitializationError } from './errors.js';

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('should register and lookup adapters case-insensitively', () => {
    const gemini = new GeminiAIAdapter();
    registry.register('Gemini', gemini);

    expect(registry.has('gemini')).toBe(true);
    expect(registry.get('GEMINI')).toBe(gemini);
    expect(registry.size).toBe(1);
  });

  it('should prevent duplicate adapter registration', () => {
    const adapter1 = new MockAIAdapter({ name: 'test' });
    const adapter2 = new MockAIAdapter({ name: 'test' });

    registry.register('test', adapter1);
    expect(() => registry.register('TEST', adapter2)).toThrow(AdapterError);
  });

  it('should unregister adapters', () => {
    const claude = new ClaudeAIAdapter();
    registry.register('claude', claude);
    registry.setActive('claude');

    expect(registry.getActiveName()).toBe('claude');
    const removed = registry.unregister('claude');

    expect(removed).toBe(true);
    expect(registry.get('claude')).toBeUndefined();
    expect(registry.getActive()).toBeUndefined();
  });

  it('should list all registered adapters with summary information', async () => {
    const gemini = new GeminiAIAdapter();
    const claude = new ClaudeAIAdapter();

    await gemini.initialize();
    registry.register('gemini', gemini);
    registry.register('claude', claude);
    registry.setActive('gemini');

    const list = registry.list();
    expect(list).toHaveLength(2);

    const geminiSummary = list.find((a) => a.name === 'gemini');
    expect(geminiSummary).toBeDefined();
    expect(geminiSummary?.status).toBe('ready');
    expect(geminiSummary?.isActive).toBe(true);

    const claudeSummary = list.find((a) => a.name === 'claude');
    expect(claudeSummary?.isActive).toBe(false);
  });

  it('should throw when setting non-existent adapter as active', () => {
    expect(() => registry.setActive('non-existent')).toThrow(AdapterInitializationError);
  });
});

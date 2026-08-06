import { describe, it, expect } from 'vitest';
import { parseCLIInput } from './command-parser.js';

describe('parseCLIInput', () => {
  it('should parse @agy prompt commands', () => {
    const res = parseCLIInput('@agy Explain Rust ownership');
    expect(res).toEqual({
      type: 'ai',
      adapterName: 'agy',
      prompt: 'Explain Rust ownership',
    });
  });

  it('should parse @gemini prompt commands', () => {
    const res = parseCLIInput('@gemini Explain async/await');
    expect(res).toEqual({
      type: 'ai',
      adapterName: 'gemini',
      prompt: 'Explain async/await',
    });
  });

  it('should handle case insensitivity and whitespace', () => {
    const res = parseCLIInput('  @AGY   Refactor this function  ');
    expect(res).toEqual({
      type: 'ai',
      adapterName: 'agy',
      prompt: 'Refactor this function',
    });
  });

  it('should parse normal chat messages without AI prefix', () => {
    const res = parseCLIInput('Hello team! How are we doing?');
    expect(res).toEqual({
      type: 'chat',
      text: 'Hello team! How are we doing?',
    });
  });

  it('should parse /mode command and mode options', () => {
    expect(parseCLIInput('/mode')).toEqual({ type: 'mode', targetMode: undefined });
    expect(parseCLIInput('/mode auto')).toEqual({ type: 'mode', targetMode: 'auto' });
    expect(parseCLIInput('/mode manual')).toEqual({ type: 'mode', targetMode: 'manual' });
    expect(parseCLIInput('/mode accept')).toEqual({ type: 'mode', targetMode: 'accept-edits' });
  });
});


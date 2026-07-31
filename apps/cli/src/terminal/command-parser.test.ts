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
});

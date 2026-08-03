import { describe, it, expect } from 'vitest';
import { visibleLength, wrapText, stripAnsi } from '../utils/word-wrap.js';

describe('Word Wrap Utility', () => {
  it('strips ANSI codes accurately', () => {
    const raw = '\u001b[31mHello\u001b[0m World';
    expect(stripAnsi(raw)).toBe('Hello World');
    expect(visibleLength(raw)).toBe(11);
  });

  it('wraps text to max width', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const wrapped = wrapText(text, 20);
    expect(wrapped.length).toBeGreaterThan(1);
    for (const line of wrapped) {
      expect(visibleLength(line)).toBeLessThanOrEqual(20);
    }
  });
});

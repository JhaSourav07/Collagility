import { describe, it, expect } from 'vitest';
import { HumanReadableSessionIdGenerator } from './id-generator.js';

describe('HumanReadableSessionIdGenerator', () => {
  it('should generate a slug matching adjective-noun-number pattern', () => {
    const generator = new HumanReadableSessionIdGenerator();
    const id = generator.generate();

    expect(typeof id).toBe('string');
    const parts = id.split('-');
    expect(parts.length).toBe(3);
    expect(Number.isNaN(Number(parts[2]))).toBe(false);
  });
});

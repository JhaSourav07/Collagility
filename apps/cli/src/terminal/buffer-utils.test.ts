import { describe, it, expect } from 'vitest';
import { appendAndTrimTerminalBuffer } from './buffer-utils.js';

describe('appendAndTrimTerminalBuffer Regression Tests', () => {
  it('should prevent unbounded memory growth across N simulated broadcast events', () => {
    let buffer = '';
    const totalBroadcastEvents = 1000;

    for (let i = 0; i < totalBroadcastEvents; i++) {
      buffer = appendAndTrimTerminalBuffer(buffer, `Broadcast log line #${i}`, 50);
    }

    const lines = buffer.split('\n');

    // Assert buffer never exceeds maximum configured window bounds (50 lines)
    expect(lines.length).toBeLessThanOrEqual(50);
    expect(lines[lines.length - 1]).toBe('Broadcast log line #999');

    // Assert oldest stale lines (< 950) were discarded from memory
    expect(lines.some((l) => l.includes('#0'))).toBe(false);
    expect(lines.some((l) => l.includes('#100'))).toBe(false);
  });

  it('should trim stale session output and prevent visible banner duplication on host re-initialization', () => {
    let buffer = '';

    // Session 1 output with Welcome Banner
    buffer = appendAndTrimTerminalBuffer(buffer, '🟢 [Live Terminal - agy]');
    buffer = appendAndTrimTerminalBuffer(buffer, 'Step 1: Running initial research...');
    buffer = appendAndTrimTerminalBuffer(buffer, 'Step 2: Editing files...');

    expect(buffer).toContain('Step 1: Running initial research...');

    // Host session re-initialization occurs and re-sends welcome banner
    buffer = appendAndTrimTerminalBuffer(buffer, '🟢 [Live Terminal - agy]');
    buffer = appendAndTrimTerminalBuffer(buffer, 'Step 1: Re-initialized prompt processing...');

    const lines = buffer.split('\n');

    // Assert stale session 1 lines prior to the latest banner are discarded
    expect(lines.filter((l) => l.includes('[Live Terminal - agy]'))).toHaveLength(1);
    expect(buffer).not.toContain('Step 1: Running initial research...');
    expect(buffer).toContain('Step 1: Re-initialized prompt processing...');
  });
});

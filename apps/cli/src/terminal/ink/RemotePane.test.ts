import { describe, it, expect } from 'vitest';
import { formatRemoteScreenLines } from './RemotePane.js';

describe('RemotePane Helper & Formatter', () => {
  it('returns empty array when screenData is empty', () => {
    const lines = formatRemoteScreenLines('');
    expect(lines).toEqual([]);
  });

  it('formats ANSI byte stream data into VirtualScreen rows correctly', () => {
    const sampleAnsi = '\x1b[32m[agy]\x1b[0m Executing test command...\n✓ Done in 1.2s';
    const lines = formatRemoteScreenLines(sampleAnsi, 80, 24);

    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain('[agy] Executing test command...');
    expect(lines[1]).toContain('✓ Done in 1.2s');
  });

  it('renders pre-sanitized structured text stream payloads cleanly', () => {
    const structuredPayload = '• Executing: list_dir\n> _Multi-step reasoning_\n✓ Task Completed';
    const lines = formatRemoteScreenLines(structuredPayload, 80, 24);

    expect(lines.some((l) => l.includes('• Executing: list_dir'))).toBe(true);
    expect(lines.some((l) => l.includes('Task Completed'))).toBe(true);
    expect(lines.every((l) => !l.includes('}}'))).toBe(true);
  });

  it('truncates screen height to match requested row bounds', () => {
    const multiLineAnsi = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join('\n');
    const lines = formatRemoteScreenLines(multiLineAnsi, 80, 15);

    expect(lines.length).toBe(15);
    expect(lines[lines.length - 1]).toContain('Line 50');
  });
});

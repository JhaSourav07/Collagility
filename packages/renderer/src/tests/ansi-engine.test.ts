import { describe, it, expect } from 'vitest';
import { ANSIEngine } from '../engine/ansi-engine.js';

describe('ANSIEngine Integration', () => {
  it('should generate valid ANSI escape sequence patches for document updates', () => {
    const engine = new ANSIEngine(30, 5);
    const patches = engine.renderDocumentToScreen('Line 1\nLine 2');
    expect(patches.length).toBeGreaterThan(0);

    const ansiOutput = engine.generateANSIPatches(patches);
    expect(ansiOutput).toContain('\x1b['); // Contains ANSI escape sequence
  });

  it('should handle screen resize and cursor clearing', () => {
    const engine = new ANSIEngine(30, 5);
    const clearOutput = engine.resize(50, 10);
    expect(engine.screen.width).toBe(50);
    expect(engine.screen.height).toBe(10);
    expect(clearOutput).toContain('\x1b[2J');
  });
});

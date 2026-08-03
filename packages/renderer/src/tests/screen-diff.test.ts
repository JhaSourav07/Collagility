import { describe, it, expect } from 'vitest';
import { VirtualScreen } from '../screen/virtual-screen.js';
import { ScreenDiffRenderer } from '../diff/screen-diff.js';

describe('ScreenDiffRenderer', () => {
  it('should detect cell changes between screen frames', () => {
    const prev = new VirtualScreen(20, 5);
    const next = new VirtualScreen(20, 5);
    const diff = new ScreenDiffRenderer();

    prev.writeString(0, 0, 'Hello');
    next.writeString(0, 0, 'Help!');

    const patches = diff.computeDiff(prev, next);
    expect(patches.length).toBe(2); // 'l' -> 'p', 'o' -> '!'
    expect(patches[0]).toEqual({ x: 3, y: 0, cell: { char: 'p' } });
    expect(patches[1]).toEqual({ x: 4, y: 0, cell: { char: '!' } });
  });
});

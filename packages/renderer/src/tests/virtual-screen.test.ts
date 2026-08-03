import { describe, it, expect } from 'vitest';
import { VirtualScreen } from '../screen/virtual-screen.js';

describe('VirtualScreen Buffer', () => {
  it('should initialize with grid dimensions', () => {
    const screen = new VirtualScreen(40, 10);
    expect(screen.width).toBe(40);
    expect(screen.height).toBe(10);
    expect(screen.getRowString(0).length).toBe(40);
  });

  it('should write string and truncate at boundary', () => {
    const screen = new VirtualScreen(10, 2);
    const written = screen.writeString(0, 0, 'Hello World!');
    expect(written).toBe(10);
    expect(screen.getRowString(0)).toBe('Hello Worl');
  });

  it('should resize screen grid preserving content', () => {
    const screen = new VirtualScreen(20, 5);
    screen.writeString(0, 0, 'Test Line');
    screen.resize(30, 10);
    expect(screen.width).toBe(30);
    expect(screen.height).toBe(10);
    expect(screen.getRowString(0).startsWith('Test Line')).toBe(true);
  });
});

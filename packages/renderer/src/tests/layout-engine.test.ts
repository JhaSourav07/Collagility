import { describe, it, expect } from 'vitest';
import { TerminalLayoutEngine } from '../layout/terminal-layout-engine.js';

describe('AGY Fixed Terminal Layout Engine Suite', () => {
  it('Fixed Input Invariance: Input position remains constant regardless of timeline length', () => {
    const engine = new TerminalLayoutEngine(80, 24);
    engine.setHeader(['Collagility Header']);
    engine.setInputText('npm test');
    engine.setStatusText('Status: Ready');

    const initialPos = engine.getInputCursorPosition();
    expect(initialPos.y).toBe(21); // 24 - 3 = 21

    // Append 100 timeline lines
    for (let i = 0; i < 100; i++) {
      engine.appendTimelineLine(`Timeline Line ${i}`);
    }

    engine.renderLayout();
    const afterPos = engine.getInputCursorPosition();
    expect(afterPos.y).toBe(21); // Input Y NEVER MOVES
    expect(engine.screen.getRowString(21)).toContain('> npm test');
    expect(engine.screen.getRowString(23)).toContain('Status: Ready');
  });

  it('Terminal Resize: updates region bounds and input row correctly', () => {
    const engine = new TerminalLayoutEngine(80, 24);
    engine.setInputText('hello');
    engine.resize(100, 40);

    const pos = engine.getInputCursorPosition();
    expect(pos.y).toBe(37); // 40 - 3 = 37
    engine.renderLayout();
    expect(engine.screen.getRowString(37)).toContain('> hello');
  });

  it('Scroll Management: handles timeline scrolling correctly', () => {
    const engine = new TerminalLayoutEngine(80, 24);
    for (let i = 0; i < 50; i++) {
      engine.appendTimelineLine(`Item ${i}`);
    }

    engine.renderLayout();
    const bottomLine = engine.screen.getRowString(20); // Row 3 + 17 = 20 (18th row of timeline viewport)
    expect(bottomLine).toContain('Item 49');

    // Scroll up by 10 items
    engine.scroll(-10);
    engine.renderLayout();
    const scrolledLine = engine.screen.getRowString(20);
    expect(scrolledLine).toContain('Item 39');
  });

  it('Notification Overlay: renders toast banner at top right', () => {
    const engine = new TerminalLayoutEngine(80, 24);
    engine.setHeader(['Collagility Header']);
    engine.addNotification('Session Created', 'success');

    engine.renderLayout();
    const headerLine = engine.screen.getRowString(0);
    expect(headerLine).toContain('[ SUCCESS: Session Created ]');
  });
});

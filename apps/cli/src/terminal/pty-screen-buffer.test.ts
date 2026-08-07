import { describe, it, expect, beforeEach } from 'vitest';
import { PtyScreenBuffer } from './pty-screen-buffer.js';

describe('PtyScreenBuffer Unit Tests', () => {
  let screenBuffer: PtyScreenBuffer;

  beforeEach(() => {
    screenBuffer = new PtyScreenBuffer({ cols: 80, rows: 10 });
  });

  it('should process clear-screen and cursor movement ANSI escape sequences', async () => {
    // Clear screen (\x1b[2J) and position cursor at top-left (\x1b[H)
    await screenBuffer.write('\x1b[2J\x1b[HHeader Title\r\nLine 1 Output');

    const lines = screenBuffer.getVisibleLines();
    expect(lines[0].trimEnd()).toBe('Header Title');
    expect(lines[1].trimEnd()).toBe('Line 1 Output');
  });

  it('should process carriage return line redraws without corrupting row alignment', async () => {
    // Write initial line, then CR (\r) and overwrite line
    await screenBuffer.write('Downloading [===       ] 30%\rDownloading [==========] 100%\r\nDone!');

    const lines = screenBuffer.getVisibleLines();
    expect(lines[0].trimEnd()).toBe('Downloading [==========] 100%');
    expect(lines[1].trimEnd()).toBe('Done!');
  });

  it('should process color code escape sequences and retain clean text content in buffer', async () => {
    // ANSI green, blue, bold escape codes
    await screenBuffer.write(
      '\x1b[32m[SUCCESS]\x1b[0m \x1b[1;34mBuild completed\x1b[0m in 1.2s\r\n'
    );

    const lines = screenBuffer.getVisibleLines();
    expect(lines[0].trimEnd()).toBe('[SUCCESS] Build completed in 1.2s');
  });

  it('should extract per-cell character details via getVisibleRowsDetailed', async () => {
    await screenBuffer.write('ABC');

    const detailedRows = screenBuffer.getVisibleRowsDetailed();
    expect(detailedRows).toHaveLength(10);
    expect(detailedRows[0].text.trimEnd()).toBe('ABC');
    expect(detailedRows[0].cells[0].char).toBe('A');
    expect(detailedRows[0].cells[1].char).toBe('B');
    expect(detailedRows[0].cells[2].char).toBe('C');
  });

  it('should support dynamic resizing and clear', async () => {
    await screenBuffer.write('Initial line');
    screenBuffer.resize(40, 5);

    expect(screenBuffer.getDimensions()).toEqual({ cols: 40, rows: 5 });
    expect(screenBuffer.getVisibleLines()).toHaveLength(5);

    screenBuffer.clear();
    const clearedLines = screenBuffer.getVisibleLines();
    expect(clearedLines.every((l) => l === '')).toBe(true);
  });
});

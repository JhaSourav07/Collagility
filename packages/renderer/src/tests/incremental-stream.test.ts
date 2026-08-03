import { describe, it, expect } from 'vitest';
import { IncrementalStreamEngine } from '../engine/incremental-stream-engine.js';

describe('Incremental Stream Rendering & Minimal Redraw Suite', () => {
  it('should process typing, thinking, searching, reading, writing, complete states without full screen clear', () => {
    const engine = new IncrementalStreamEngine(80, 24);

    // 1. Thinking state
    let res = engine.processChunk({ streamId: 's1', state: 'thinking', durationMs: 1500 });
    expect(engine.screen.getRowString(0)).toContain('Thought for 1.5s');
    expect(res.ansiOutput).not.toContain('\x1b[2J'); // Zero full screen clears

    // 2. Searching state
    res = engine.processChunk({ streamId: 's1', state: 'searching', target: 'websocket' });
    expect(engine.screen.getRowString(0)).toContain('Search(websocket)');
    expect(res.ansiOutput).not.toContain('\x1b[2J');

    // 3. Reading state
    res = engine.processChunk({ streamId: 's1', state: 'reading', target: 'gateway.ts' });
    expect(engine.screen.getRowString(0)).toContain('Read(gateway.ts)');

    // 4. Writing state
    res = engine.processChunk({ streamId: 's1', state: 'writing', target: 'protocol.ts' });
    expect(engine.screen.getRowString(0)).toContain('Write(protocol.ts)');

    // 5. Typing state
    res = engine.processChunk({ streamId: 's1', state: 'typing', content: 'Stream chunk content' });
    expect(engine.screen.getRowString(0)).toContain('Stream chunk content');

    // 6. Complete state
    res = engine.processChunk({ streamId: 's1', state: 'complete', durationMs: 120 });
    expect(engine.screen.getRowString(0)).toContain('✓ Stream Complete (120ms)');
  });

  it('Performance Benchmark: processChunk should execute in under 5ms per chunk', () => {
    const engine = new IncrementalStreamEngine(100, 30);
    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      engine.processChunk({ streamId: 's1', state: 'typing', content: `Token ${i} ` });
    }

    const elapsed = performance.now() - start;
    const avgChunkTime = elapsed / 50;
    expect(avgChunkTime).toBeLessThan(5); // Sub-5ms per chunk update
  });

  it('Cursor Positioning: verify exact cursor escape sequence generation', () => {
    const engine = new IncrementalStreamEngine(40, 10);
    const res = engine.processChunk({ streamId: 's1', state: 'typing', content: 'ABC' });
    expect(res.ansiOutput).toContain('\x1b[1;1HA');
    expect(res.ansiOutput).toContain('\x1b[1;2HB');
    expect(res.ansiOutput).toContain('\x1b[1;3HC');
  });
});

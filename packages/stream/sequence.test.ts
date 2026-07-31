import { describe, it, expect } from 'vitest';
import { SequenceTracker } from './sequence.js';
import { createStreamChunk } from './chunk.js';

describe('SequenceTracker', () => {
  const sender = { id: 'ai', name: 'gemini', role: 'ai' as const };

  it('should accept chunks in exact sequential order', () => {
    const tracker = new SequenceTracker(0);
    const c0 = createStreamChunk({ streamId: 's1', sequenceNumber: 0, sessionId: 'sess1', sender, content: 'Hello ' });
    const c1 = createStreamChunk({ streamId: 's1', sequenceNumber: 1, sessionId: 'sess1', sender, content: 'World' });

    const res0 = tracker.processChunk(c0);
    expect(res0.status).toBe('accepted');
    expect(res0.readyChunks).toHaveLength(1);
    expect(res0.readyChunks[0].content).toBe('Hello ');

    const res1 = tracker.processChunk(c1);
    expect(res1.status).toBe('accepted');
    expect(res1.readyChunks).toHaveLength(1);
    expect(res1.readyChunks[0].content).toBe('World');
  });

  it('should reorder out-of-order chunks correctly', () => {
    const tracker = new SequenceTracker(0);
    const c0 = createStreamChunk({ streamId: 's1', sequenceNumber: 0, sessionId: 'sess1', sender, content: 'Line 1\n' });
    const c1 = createStreamChunk({ streamId: 's1', sequenceNumber: 1, sessionId: 'sess1', sender, content: 'Line 2\n' });
    const c2 = createStreamChunk({ streamId: 's1', sequenceNumber: 2, sessionId: 'sess1', sender, content: 'Line 3\n' });

    // Process c0, then c2 (out of order), then c1
    tracker.processChunk(c0);

    const res2 = tracker.processChunk(c2);
    expect(res2.status).toBe('buffered');
    expect(res2.readyChunks).toHaveLength(0);
    expect(res2.gapDetected).toBe(true);

    const res1 = tracker.processChunk(c1);
    expect(res1.status).toBe('reordered');
    expect(res1.readyChunks).toHaveLength(2);
    expect(res1.readyChunks[0].sequenceNumber).toBe(1);
    expect(res1.readyChunks[1].sequenceNumber).toBe(2);
  });

  it('should deduplicate repeated chunks', () => {
    const tracker = new SequenceTracker(0);
    const c0 = createStreamChunk({ streamId: 's1', sequenceNumber: 0, sessionId: 'sess1', sender, content: 'First' });

    const res0 = tracker.processChunk(c0);
    expect(res0.status).toBe('accepted');

    const resDup = tracker.processChunk(c0);
    expect(resDup.status).toBe('duplicate');
    expect(resDup.readyChunks).toHaveLength(0);
  });
});

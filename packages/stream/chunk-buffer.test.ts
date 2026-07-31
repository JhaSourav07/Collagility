import { describe, it, expect } from 'vitest';
import { ResponseBuffer } from './chunk-buffer.js';
import { createStreamChunk } from './chunk.js';

describe('ResponseBuffer', () => {
  const sender = { id: 'ai', name: 'gemini', role: 'ai' as const };

  it('should store chunks and generate snapshots for late joiners', () => {
    const buffer = new ResponseBuffer('stream-100', 'session-100');
    buffer.addChunk(createStreamChunk({ streamId: 'stream-100', sequenceNumber: 0, sessionId: 'session-100', sender, content: 'Part 1. ' }));
    buffer.addChunk(createStreamChunk({ streamId: 'stream-100', sequenceNumber: 1, sessionId: 'session-100', sender, content: 'Part 2.' }));

    expect(buffer.getChunkCount()).toBe(2);
    expect(buffer.getAssembledText()).toBe('Part 1. Part 2.');

    const snapshot = buffer.getSnapshot('Streaming');
    expect(snapshot.streamId).toBe('stream-100');
    expect(snapshot.sessionId).toBe('session-100');
    expect(snapshot.assembledText).toBe('Part 1. Part 2.');
    expect(snapshot.totalChunks).toBe(2);
    expect(snapshot.lastSequenceNumber).toBe(1);
    expect(snapshot.state).toBe('Streaming');
  });

  it('should clear buffer contents', () => {
    const buffer = new ResponseBuffer('stream-100', 'session-100');
    buffer.addChunk(createStreamChunk({ streamId: 'stream-100', sequenceNumber: 0, sessionId: 'session-100', sender, content: 'Data' }));
    buffer.clear();

    expect(buffer.getChunkCount()).toBe(0);
    expect(buffer.getAssembledText()).toBe('');
  });
});

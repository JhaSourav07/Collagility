import { describe, it, expect, vi } from 'vitest';
import { StreamManager } from './stream-manager.js';
import { EVENT_TYPES } from '@collagility/protocol';

describe('StreamManager', () => {
  it('should enforce ONE active AI stream per session', () => {
    const manager = new StreamManager();
    manager.startStream({
      sessionId: 'sess-1',
      ownerId: 'owner-1',
      prompt: 'First prompt',
      adapterName: 'gemini',
    });

    expect(() =>
      manager.startStream({
        sessionId: 'sess-1',
        ownerId: 'owner-1',
        prompt: 'Second prompt',
        adapterName: 'gemini',
      })
    ).toThrow(/already has an active AI stream/);
  });

  it('should process raw chunks and emit stream events', () => {
    const manager = new StreamManager();
    const eventSpy = vi.fn();
    manager.on('streamEvent', eventSpy);

    manager.startStream({
      sessionId: 'sess-2',
      ownerId: 'owner-1',
      prompt: 'Write code',
      adapterName: 'gemini',
    });

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EVENT_TYPES.AI_STREAM_STARTED,
      })
    );

    manager.handleRawChunk('sess-2', 'Chunk 1\n');
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EVENT_TYPES.AI_STREAM_CHUNK,
        payload: expect.objectContaining({
          content: 'Chunk 1\n',
          sequenceNumber: 0,
        }),
      })
    );

    manager.handleRawChunk('sess-2', 'Chunk 2\n', true);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EVENT_TYPES.AI_STREAM_COMPLETED,
      })
    );
  });

  it('should handle cancellation flow', () => {
    const manager = new StreamManager();
    const eventSpy = vi.fn();
    manager.on('streamEvent', eventSpy);

    manager.startStream({
      sessionId: 'sess-3',
      ownerId: 'owner-1',
      prompt: 'Long running task',
      adapterName: 'gemini',
    });

    const cancelled = manager.cancelStream('sess-3', 'owner-1', 'User pressed Ctrl+C');
    expect(cancelled).toBe(true);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EVENT_TYPES.AI_STREAM_CANCELLED,
        payload: expect.objectContaining({
          reason: 'User pressed Ctrl+C',
        }),
      })
    );
    expect(manager.isStreamActive('sess-3')).toBe(false);
  });

  it('should support late joiner snapshot retrieval', () => {
    const manager = new StreamManager();
    manager.startStream({
      sessionId: 'sess-4',
      ownerId: 'owner-1',
      prompt: 'Generate docs',
      adapterName: 'gemini',
    });

    manager.handleRawChunk('sess-4', 'Line 1\n');
    manager.handleRawChunk('sess-4', 'Line 2\n');

    const snapshot = manager.getLateJoinerState('sess-4');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.assembledText).toBe('Line 1\nLine 2\n');
    expect(snapshot?.totalChunks).toBe(2);
    expect(snapshot?.state).toBe('Streaming');
  });
});

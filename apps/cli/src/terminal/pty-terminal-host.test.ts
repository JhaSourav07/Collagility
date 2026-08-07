import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PtyTerminalHost, ThrottledPtyStreamer, type IPtyProcess } from './pty-terminal-host.js';
import { EVENT_TYPES, type TerminalPtyFramePayload } from '@collagility/protocol';

describe('PtyTerminalHost & ThrottledPtyStreamer Unit Tests', () => {
  let wsClientSendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    wsClientSendSpy = vi.fn();
  });

  function createMockPtyProcess() {
    const dataEmitter = new EventEmitter();
    const exitEmitter = new EventEmitter();
    const proc: IPtyProcess = {
      onData: (listener) => {
        dataEmitter.on('data', listener);
        return { dispose: () => dataEmitter.off('data', listener) };
      },
      onExit: (listener) => {
        exitEmitter.on('exit', listener);
        return { dispose: () => exitEmitter.off('exit', listener) };
      },
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    return { proc, dataEmitter, exitEmitter };
  }

  it('should stream raw bytes through ThrottledPtyStreamer maintaining 1:1 byte sequence order', async () => {
    const receivedFlushes: Array<{ data: string; seq: number }> = [];
    const streamer = new ThrottledPtyStreamer((data, seq) => {
      receivedFlushes.push({ data, seq });
    }, 10);

    const inputChunk1 = 'Hello ';
    const inputChunk2 = 'World!\r\n';

    streamer.push(inputChunk1);
    streamer.push(inputChunk2);

    await new Promise((r) => setTimeout(r, 20));

    expect(receivedFlushes).toHaveLength(1);
    expect(receivedFlushes[0].seq).toBe(0);
    expect(receivedFlushes[0].data).toBe('Hello World!\r\n');

    const concatenated = receivedFlushes.map((f) => f.data).join('');
    expect(concatenated).toBe('Hello World!\r\n');
  });

  it('should handle multi-byte UTF-8 and ANSI escape sequences split across chunk boundaries without byte corruption', async () => {
    const receivedFrames: TerminalPtyFramePayload[] = [];
    const mockWsClient = {
      send: (type: string, payload: any) => {
        if (type === EVENT_TYPES.TERMINAL_PTY_FRAME) {
          receivedFrames.push(payload);
        }
      },
    };

    const host = new PtyTerminalHost({
      sessionId: 'test-pty-session-123',
      wsClient: mockWsClient,
      flushIntervalMs: 10,
    });

    const fullComplexString =
      '\x1b[32m[COLLAGILITY MULTIPLAYER]\x1b[0m ⚡ 🟢 📁 🔍 🤖 🚀\r\n' +
      '\x1b[1;34mJapanese text:\x1b[0m こんにちは世界\r\n' +
      '\x1b[KOverwritten line via CR\rOverwritten line clean\r\n';

    // Intentionally split ANSI escape sequence (\x1b[32m) into two chunks
    const chunk1 = fullComplexString.slice(0, 4); // "\x1b[32"
    const chunk2 = fullComplexString.slice(4, 30); // "m[COLLAGILITY MULTIPLAYER]..."
    const chunk3 = fullComplexString.slice(30);

    host.writeRawData(chunk1);
    await new Promise((r) => setTimeout(r, 15));

    host.writeRawData(chunk2);
    await new Promise((r) => setTimeout(r, 15));

    host.writeRawData(chunk3);
    await new Promise((r) => setTimeout(r, 15));

    host.flush();

    expect(receivedFrames.length).toBeGreaterThanOrEqual(1);

    // Verify sequence numbers increment monotonically starting from 0
    receivedFrames.forEach((frame, idx) => {
      expect(frame.seq).toBe(idx);
      expect(frame.sessionId).toBe('test-pty-session-123');
      expect(frame.encoding).toBe('utf8');
    });

    // Reconstruct all frames over the wire
    const reconstructedString = receivedFrames.map((f) => f.data).join('');

    // Assert exact byte-level identity between original input and reconstructed wire frames
    expect(reconstructedString).toBe(fullComplexString);
    expect(Buffer.from(reconstructedString)).toEqual(Buffer.from(fullComplexString));
  });

  it('should instantly flush when push data exceeds maxChunkSizeBytes limit', () => {
    const receivedFlushes: Array<{ data: string; seq: number }> = [];
    const streamer = new ThrottledPtyStreamer(
      (data, seq) => {
        receivedFlushes.push({ data, seq });
      },
      100,
      100 // Small 100 byte maxChunkSizeBytes limit for testing
    );

    const largeData = 'A'.repeat(150);
    streamer.push(largeData);

    // Flush should happen synchronously during push because maxChunkSizeBytes limit was exceeded
    expect(receivedFlushes).toHaveLength(1);
    expect(receivedFlushes[0].data).toBe(largeData);
    expect(receivedFlushes[0].seq).toBe(0);
  });

  it('should support injectable spawnPtyFn mock without real PTY or tmux dependencies', () => {
    const { proc, dataEmitter, exitEmitter } = createMockPtyProcess();
    const spawnPtyMock = vi.fn().mockReturnValue(proc);

    const receivedEvents: any[] = [];
    const host = new PtyTerminalHost({
      sessionId: 'mock-pty-session',
      spawnPtyFn: spawnPtyMock,
      onFrame: (evt) => receivedEvents.push(evt),
      flushIntervalMs: 10,
    });

    const activePtyProc = host.startPtySession('agy', ['-p', 'Test prompt']);

    expect(spawnPtyMock).toHaveBeenCalledWith(
      'agy',
      ['-p', 'Test prompt'],
      expect.objectContaining({ cols: 80, rows: 24 })
    );
    expect(activePtyProc).toBe(proc);

    // Emit synthetic stdout data from process
    dataEmitter.emit('data', '\x1b[33mProcessing prompt...\x1b[0m\n');
    exitEmitter.emit('exit', { exitCode: 0 });

    const emissions = receivedEvents.map((e) => e.payload.data).join('');
    expect(emissions).toBe('\x1b[33mProcessing prompt...\x1b[0m\n');

    host.destroy();
    expect(proc.kill).toHaveBeenCalled();
  });
});

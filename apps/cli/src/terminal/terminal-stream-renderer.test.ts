import { describe, it, expect, vi } from 'vitest';
import { TerminalStreamRenderer, ThrottledTerminalStreamer } from './terminal-stream-renderer.js';
import { createStreamChunk } from '@collagility/stream';

describe('TerminalStreamRenderer', () => {
  const sender = { id: 'ai', name: 'gemini', role: 'ai' as const };

  it('should render stream start, incremental chunks, and completion summary', () => {
    let output = '';
    const mockStdout = {
      write: (str: string) => {
        output += str;
        return true;
      },
    };

    const renderer = new TerminalStreamRenderer({ stdout: mockStdout });
    renderer.onStreamStarted('stream-1', 'gemini', 'Explain quantum computing');

    expect(output).toContain('AI Stream Started (gemini)');
    expect(output).toContain('Explain quantum computing');

    renderer.renderChunk(createStreamChunk({ streamId: 'stream-1', sequenceNumber: 0, sessionId: 'sess-1', sender, content: 'Quantum computing uses ' }));
    renderer.renderChunk(createStreamChunk({ streamId: 'stream-1', sequenceNumber: 1, sessionId: 'sess-1', sender, content: 'qubits.' }));

    expect(output).toContain('Quantum computing uses qubits.');

    renderer.onStreamCompleted({ totalChunks: 2, durationMs: 150 });
    expect(output).toContain('Stream Complete (2 chunks, 150ms');
  });

  it('should format code blocks gracefully', () => {
    let output = '';
    const mockStdout = {
      write: (str: string) => {
        output += str;
        return true;
      },
    };

    const renderer = new TerminalStreamRenderer({ stdout: mockStdout });
    renderer.onStreamStarted('stream-2', 'gemini', 'Code demo');
    renderer.renderChunk(createStreamChunk({ streamId: 'stream-2', sequenceNumber: 0, sessionId: 'sess-1', sender, content: '```typescript\nconst x = 1;\n```' }));

    expect(output).toContain('┌── [typescript]');
    expect(output).toContain('const x = 1;');
    expect(output).toContain('└────');
  });

  it('should batch stdout chunks via ThrottledTerminalStreamer and emit to wsClient', async () => {
    const emittedBatches: string[] = [];
    const streamer = new ThrottledTerminalStreamer((data) => {
      emittedBatches.push(data);
    }, 10);

    streamer.push('Hello ');
    streamer.push('World!');

    // Wait for 20ms for timer to flush
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(emittedBatches.length).toBe(1);
    expect(emittedBatches[0]).toBe('Hello World!');

    streamer.destroy();
  });
});

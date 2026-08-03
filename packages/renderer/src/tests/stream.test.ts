import { describe, it, expect } from 'vitest';
import { StreamDocumentRenderer } from '../renderer/stream-renderer.js';

describe('StreamDocumentRenderer', () => {
  it('renders streaming chunks progressively', () => {
    const streamRenderer = new StreamDocumentRenderer({ maxWidth: 60 });
    
    streamRenderer.appendChunk('# Streaming Demo\n');
    let output = streamRenderer.getRenderedOutput();
    expect(output).toContain('Streaming Demo');

    streamRenderer.appendChunk('\nThis is paragraph chunk 1. ');
    streamRenderer.appendChunk('This is paragraph chunk 2.');
    output = streamRenderer.getRenderedOutput();
    expect(output).toContain('This is paragraph chunk 1. This is paragraph chunk 2.');
  });
});

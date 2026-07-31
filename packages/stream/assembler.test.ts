import { describe, it, expect } from 'vitest';
import { ChunkAssembler } from './assembler.js';
import { createStreamChunk } from './chunk.js';

describe('ChunkAssembler', () => {
  const sender = { id: 'ai', name: 'gemini', role: 'ai' as const };

  it('should assemble incremental text chunks into complete response', () => {
    const assembler = new ChunkAssembler();
    assembler.appendChunk(createStreamChunk({ streamId: 's1', sequenceNumber: 0, sessionId: 'sess1', sender, content: 'Const x = ' }));
    assembler.appendChunk(createStreamChunk({ streamId: 's1', sequenceNumber: 1, sessionId: 'sess1', sender, content: '100;' }));

    expect(assembler.getFullText()).toBe('Const x = 100;');
  });

  it('should parse markdown code block sections', () => {
    const assembler = new ChunkAssembler();
    assembler.appendChunk(createStreamChunk({ streamId: 's1', sequenceNumber: 0, sessionId: 'sess1', sender, content: 'Here is code:\n```typescript\n' }));
    expect(assembler.isInsideCodeBlock()).toBe(true);

    assembler.appendChunk(createStreamChunk({ streamId: 's1', sequenceNumber: 1, sessionId: 'sess1', sender, content: 'const a = 1;\n```\nDone' }));
    expect(assembler.isInsideCodeBlock()).toBe(false);

    const blocks = assembler.getCodeBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('typescript');
    expect(blocks[0].isComplete).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { MarkdownLexer } from '../lexer/lexer.js';

describe('MarkdownLexer', () => {
  it('tokenizes headings correctly', () => {
    const lexer = new MarkdownLexer();
    const tokens = lexer.tokenize('# Heading 1\n## Heading 2\n### Heading 3');
    expect(tokens.length).toBe(3);
    expect(tokens[0]).toEqual({ type: 'heading', level: 1, content: 'Heading 1' });
    expect(tokens[1]).toEqual({ type: 'heading', level: 2, content: 'Heading 2' });
    expect(tokens[2]).toEqual({ type: 'heading', level: 3, content: 'Heading 3' });
  });

  it('tokenizes code blocks correctly', () => {
    const lexer = new MarkdownLexer();
    const tokens = lexer.tokenize('```ts\nconst x = 42;\n```');
    expect(tokens.length).toBe(1);
    expect(tokens[0]).toEqual({
      type: 'code_block',
      language: 'ts',
      content: 'const x = 42;',
    });
  });

  it('tokenizes bullet and task items correctly', () => {
    const lexer = new MarkdownLexer();
    const tokens = lexer.tokenize('- [ ] TODO task\n- [x] Completed task\n* Normal bullet');
    expect(tokens.length).toBe(3);
    expect(tokens[0]).toEqual({ type: 'task_item', checked: false, content: 'TODO task' });
    expect(tokens[1]).toEqual({ type: 'task_item', checked: true, content: 'Completed task' });
    expect(tokens[2]).toEqual({ type: 'bullet_item', content: 'Normal bullet' });
  });
});

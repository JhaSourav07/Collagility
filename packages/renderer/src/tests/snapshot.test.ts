import { describe, it, expect } from 'vitest';
import { MarkdownLexer } from '../lexer/lexer.js';
import { MarkdownParser } from '../parser/parser.js';
import { DocumentRenderer } from '../renderer/document-renderer.js';

describe('Markdown AST & Snapshot Pipeline', () => {
  const lexer = new MarkdownLexer();
  const parser = new MarkdownParser();
  const renderer = new DocumentRenderer({ maxWidth: 80, theme: 'dark' });

  it('should parse and render Headings (#, ##, ###)', () => {
    const md = '# Title H1\n## Subtitle H2\n### Section H3';
    const ast = parser.parse(md);
    expect(ast.children).toHaveLength(3);
    expect(ast.children[0].type).toBe('heading');
    expect(ast.children[1].type).toBe('heading');
    expect(ast.children[2].type).toBe('heading');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('Title H1');
    expect(output).toContain('Subtitle H2');
    expect(output).toContain('Section H3');
  });

  it('should parse and render Paragraphs, Links, and Inline Formatting', () => {
    const md = 'This is a **bold** paragraph with a [link](https://collagility.dev).';
    const ast = parser.parse(md);
    expect(ast.children[0].type).toBe('paragraph');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('This is a bold paragraph with a');
    expect(output).toContain('link');
  });

  it('should parse and render Task Lists (- [ ] and - [x])', () => {
    const md = '- [ ] Uncompleted task\n- [x] Completed task';
    const tokens = lexer.tokenize(md);
    expect(tokens[0].type).toBe('task_item');
    expect(tokens[0].checked).toBe(false);
    expect(tokens[1].checked).toBe(true);

    const ast = parser.parse(md);
    expect(ast.children[0].type).toBe('list');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('Uncompleted task');
    expect(output).toContain('Completed task');
  });

  it('should parse and render Fenced Code Blocks', () => {
    const md = '```ts\nconst x = 42;\n```';
    const ast = parser.parse(md);
    expect(ast.children[0].type).toBe('code_block');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('const x = 42;');
    expect(output).toContain('┌');
    expect(output).toContain('└');
  });

  it('should parse and render Block Quotes and Horizontal Rules', () => {
    const md = '> Critical Architecture Notice\n---\n';
    const ast = parser.parse(md);
    expect(ast.children[0].type).toBe('block_quote');
    expect(ast.children[1].type).toBe('horizontal_rule');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('Critical Architecture Notice');
    expect(output).toContain('───');
  });

  it('should parse and render Tables', () => {
    const md = '| Header 1 | Header 2 |\n|---|---|\n| Cell A | Cell B |';
    const ast = parser.parse(md);
    expect(ast.children[0].type).toBe('table');

    const output = renderer.renderMarkdown(md);
    expect(output).toContain('Header 1');
    expect(output).toContain('Cell A');
  });
});

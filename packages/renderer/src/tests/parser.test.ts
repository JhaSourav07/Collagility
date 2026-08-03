import { describe, it, expect } from 'vitest';
import { MarkdownParser } from '../parser/parser.js';

describe('MarkdownParser', () => {
  it('parses headings into AST nodes', () => {
    const parser = new MarkdownParser();
    const doc = parser.parse('# Authentication\n## JWT');
    expect(doc.type).toBe('document');
    expect(doc.children.length).toBe(2);
    expect(doc.children[0]).toMatchObject({ type: 'heading', level: 1, text: 'Authentication' });
    expect(doc.children[1]).toMatchObject({ type: 'heading', level: 2, text: 'JWT' });
  });

  it('parses tables into AST table nodes', () => {
    const parser = new MarkdownParser();
    const doc = parser.parse('| Name | Role |\n| --- | --- |\n| Sourav | Owner |');
    expect(doc.children.length).toBe(1);
    expect(doc.children[0]).toMatchObject({
      type: 'table',
      headers: ['Name', 'Role'],
      rows: [['Sourav', 'Owner']],
    });
  });
});

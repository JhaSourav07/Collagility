import type { Token } from '../lexer/tokens.js';
import type { ASTNode, DocumentNode, ListNode, TableNode } from '../ast/nodes.js';
import { MarkdownLexer } from '../lexer/lexer.js';

export class MarkdownParser {
  private lexer: MarkdownLexer;

  constructor() {
    this.lexer = new MarkdownLexer();
  }

  public parse(markdown: string): DocumentNode {
    const tokens = this.lexer.tokenize(markdown);
    const children: ASTNode[] = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === 'heading') {
        children.push({
          type: 'heading',
          level: token.level as 1 | 2 | 3 | 4 | 5 | 6,
          text: token.content,
        });
        i++;
        continue;
      }

      if (token.type === 'hr') {
        children.push({ type: 'horizontal_rule' });
        i++;
        continue;
      }

      if (token.type === 'code_block') {
        children.push({
          type: 'code_block',
          language: token.language,
          code: token.content,
        });
        i++;
        continue;
      }

      if (token.type === 'quote') {
        const quoteChildren: ASTNode[] = [];
        while (i < tokens.length && tokens[i].type === 'quote') {
          quoteChildren.push({
            type: 'paragraph',
            children: [{ type: 'text', text: tokens[i].content }],
          });
          i++;
        }
        children.push({
          type: 'block_quote',
          children: quoteChildren,
        });
        continue;
      }

      if (token.type === 'bullet_item' || token.type === 'numbered_item' || token.type === 'task_item') {
        const isOrdered = token.type === 'numbered_item';
        const listNode: ListNode = {
          type: 'list',
          ordered: isOrdered,
          items: [],
        };

        while (
          i < tokens.length &&
          (tokens[i].type === 'bullet_item' || tokens[i].type === 'numbered_item' || tokens[i].type === 'task_item')
        ) {
          const itemToken = tokens[i];
          listNode.items.push({
            type: 'list_item',
            text: itemToken.content,
            checked: itemToken.checked,
          });
          i++;
        }
        children.push(listNode);
        continue;
      }

      if (token.type === 'table_row') {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Parse Table Header
        headers.push(
          ...token.content
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
        );
        i++;

        // Skip separator row if present (|---|---|)
        if (i < tokens.length && tokens[i].type === 'table_row' && /^[|\-:\s]+$/.test(tokens[i].content)) {
          i++;
        }

        // Parse Table Data Rows
        while (i < tokens.length && tokens[i].type === 'table_row') {
          const cells = tokens[i].content
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean);
          rows.push(cells);
          i++;
        }

        const tableNode: TableNode = {
          type: 'table',
          headers,
          rows,
        };
        children.push(tableNode);
        continue;
      }

      if (token.type === 'paragraph') {
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', text: token.content }],
        });
        i++;
        continue;
      }

      i++;
    }

    return {
      type: 'document',
      children,
    };
  }
}

import type { Token } from './tokens.js';

export class MarkdownLexer {
  public preprocess(markdown: string): string {
    let text = markdown;

    // Split headings attached to previous text without a newline (e.g. "text...### Heading")
    text = text.replace(/([a-zA-Z0-9.,!?])(#{1,6}\s+)/g, '$1\n$2');

    // Split horizontal rules attached to previous text (e.g. "text...---")
    text = text.replace(/([a-zA-Z0-9.,!?])(---|\*\*\*|___)/g, '$1\n$2');

    // Split code block fences attached to previous text (e.g. "text...```ts")
    text = text.replace(/([a-zA-Z0-9.,!?])(```)/g, '$1\n$2');

    return text;
  }

  public tokenize(rawMarkdown: string): Token[] {
    const tokens: Token[] = [];
    const markdown = this.preprocess(rawMarkdown);
    const lines = markdown.split(/\r?\n/);
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code Block fence detection
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          // Close code block
          tokens.push({
            type: 'code_block',
            content: codeBuffer.join('\n'),
            language: codeLanguage,
          });
          inCodeBlock = false;
          codeLanguage = '';
          codeBuffer = [];
        } else {
          // Open code block
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      if (!trimmed) {
        continue;
      }

      // Horizontal Rule
      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        tokens.push({ type: 'hr', content: '' });
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        tokens.push({
          type: 'heading',
          level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
          content: headingMatch[2],
        });
        continue;
      }

      // Task List Item
      const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        tokens.push({
          type: 'task_item',
          checked: taskMatch[1].toLowerCase() === 'x',
          content: taskMatch[2],
        });
        continue;
      }

      // Bullet List Item
      const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
      if (bulletMatch) {
        tokens.push({
          type: 'bullet_item',
          content: bulletMatch[1],
        });
        continue;
      }

      // Numbered List Item
      const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberMatch) {
        tokens.push({
          type: 'numbered_item',
          content: numberMatch[2],
          ordered: true,
        });
        continue;
      }

      // Block Quote
      const quoteMatch = line.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        tokens.push({
          type: 'quote',
          content: quoteMatch[1],
        });
        continue;
      }

      // Table Row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        tokens.push({
          type: 'table_row',
          content: trimmed,
        });
        continue;
      }

      // Regular Paragraph Line
      tokens.push({
        type: 'paragraph',
        content: line,
      });
    }

    // Unclosed code block safety check
    if (inCodeBlock && codeBuffer.length > 0) {
      tokens.push({
        type: 'code_block',
        content: codeBuffer.join('\n'),
        language: codeLanguage,
      });
    }

    return tokens;
  }
}

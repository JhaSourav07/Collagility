import type { ParagraphNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { wrapText } from '../utils/word-wrap.js';

export class ParagraphComponent implements RenderComponent<ParagraphNode> {
  public render(node: ParagraphNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;

    let fullText = node.children
      ? node.children
          .map((child) => {
            if (child.type === 'text') {
              let t = child.text;
              if (child.bold) t = formatter.bold(t);
              if (child.italic) t = formatter.italic(t);
              if (child.code) t = formatter.code(t);
              return t;
            } else if (child.type === 'link') {
              if (child.isFileRef) {
                return formatter.fileRef(child.text);
              }
              return formatter.webLink(child.text, child.url);
            }
            return '';
          })
          .join('')
      : '';

    // Parse inline bold: **text**
    fullText = fullText.replace(/\*\*([^*]+)\*\*/g, (_match, content) => {
      return formatter.bold(content);
    });

    // Parse inline italic: *text*
    fullText = fullText.replace(/\*([^*]+)\*/g, (_match, content) => {
      return formatter.italic(content);
    });

    // Parse inline code: `code`
    fullText = fullText.replace(/`([^`]+)`/g, (_match, content) => {
      return formatter.code(content);
    });

    // Auto-detect Markdown link syntax: [label](url), preventing matching ANSI escapes
    fullText = fullText.replace(/(?<!\u001b)\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
      const isFile =
        url.startsWith('file://') ||
        (!url.includes('://') &&
          (url.includes('/') || /\.(ts|tsx|js|jsx|json|md|py|go|rs|css|html|yml|yaml)$/i.test(url)));
      if (isFile) {
        return formatter.fileRef(label);
      }
      return formatter.webLink(label, url);
    });

    const wrappedLines = wrapText(fullText, maxWidth);
    return wrappedLines.join('\n');
  }
}

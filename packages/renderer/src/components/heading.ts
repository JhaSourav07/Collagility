import type { HeadingNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { BOX_SYMBOLS } from '../ansi/formatter.js';
import { visibleLength } from '../utils/word-wrap.js';

export class HeadingComponent implements RenderComponent<HeadingNode> {
  public render(node: HeadingNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const text = node.text;
    const len = Math.min(Math.max(visibleLength(text), 10), maxWidth);

    if (node.level === 1) {
      const line = BOX_SYMBOLS.heavy.horizontal.repeat(len);
      return [
        formatter.border(line),
        formatter.heading(text),
        formatter.border(line),
      ].join('\n');
    }

    if (node.level === 2) {
      const underline = BOX_SYMBOLS.single.horizontal.repeat(len);
      return [
        formatter.subheading(text),
        formatter.border(underline),
      ].join('\n');
    }

    // H3 - H6
    const prefix = '#'.repeat(node.level) + ' ';
    return formatter.subheading(`${prefix}${text}`);
  }
}

import type { BlockQuoteNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { wrapText } from '../utils/word-wrap.js';

export class QuoteComponent implements RenderComponent<BlockQuoteNode> {
  public render(node: BlockQuoteNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const borderChar = formatter.quoteBorder('│ ');
    const lines: string[] = [];

    for (const child of node.children) {
      const rawText = (child as any).text || (child as any).content || '';
      const wrapped = wrapText(rawText, maxWidth - 4);
      for (const line of wrapped) {
        lines.push(`${borderChar}${formatter.italic(line)}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : `${borderChar}`;
  }
}

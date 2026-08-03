import type { CodeBlockNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { BOX_SYMBOLS } from '../ansi/formatter.js';
import { padRight, visibleLength, wrapText } from '../utils/word-wrap.js';

export class CodeBlockComponent implements RenderComponent<CodeBlockNode> {
  public render(node: CodeBlockNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const lang = node.language ? ` ${node.language} ` : '';
    const rawLines = node.code.split(/\r?\n/);

    // Inner content width calculation
    const contentWidth = Math.min(
      Math.max(
        ...rawLines.map((l) => visibleLength(l)),
        lang ? lang.length + 4 : 20
      ),
      maxWidth - 4
    );

    const b = BOX_SYMBOLS.single;
    const topFillLen = Math.max(0, contentWidth - lang.length);
    const topBorder = formatter.border(`${b.topLeft}${lang}${b.horizontal.repeat(topFillLen)}${b.topRight}`);
    const bottomBorder = formatter.border(`${b.bottomLeft}${b.horizontal.repeat(contentWidth)}${b.bottomRight}`);

    const formattedLines: string[] = [];

    for (const rawLine of rawLines) {
      const wrapped = wrapText(rawLine, contentWidth);
      for (const line of wrapped) {
        const padded = padRight(line, contentWidth);
        const codeText = formatter.colorHex('#34d399', padded);
        formattedLines.push(
          `${formatter.border(b.vertical)} ${codeText} ${formatter.border(b.vertical)}`
        );
      }
    }

    return [topBorder, ...formattedLines, bottomBorder].join('\n');
  }
}

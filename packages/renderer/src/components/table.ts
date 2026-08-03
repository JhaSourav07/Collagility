import type { TableNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { BOX_SYMBOLS } from '../ansi/formatter.js';
import { padRight, visibleLength } from '../utils/word-wrap.js';

export class TableComponent implements RenderComponent<TableNode> {
  public render(node: TableNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const colCount = Math.max(node.headers.length, ...node.rows.map((r) => r.length));
    if (colCount === 0) return '';

    // Calculate maximum width per column
    const colWidths: number[] = new Array(colCount).fill(5);

    for (let c = 0; c < colCount; c++) {
      const headerText = node.headers[c] || '';
      colWidths[c] = Math.max(colWidths[c], visibleLength(headerText));

      for (const row of node.rows) {
        const cellText = row[c] || '';
        colWidths[c] = Math.max(colWidths[c], visibleLength(cellText));
      }
    }

    // Scale down column widths if total width exceeds maxWidth
    const totalBorderWidth = colCount + 1;
    const availWidth = maxWidth - totalBorderWidth;
    const sumWidths = colWidths.reduce((a, b) => a + b, 0);

    if (sumWidths > availWidth && sumWidths > 0) {
      for (let c = 0; c < colCount; c++) {
        colWidths[c] = Math.max(3, Math.floor((colWidths[c] / sumWidths) * availWidth));
      }
    }

    const b = BOX_SYMBOLS.single;

    // Top border: ┌───┬───┐
    const topRow =
      b.topLeft + colWidths.map((w) => b.horizontal.repeat(w + 2)).join(b.teeDown) + b.topRight;

    // Middle separator: ├───┼───┤
    const midRow =
      b.teeRight + colWidths.map((w) => b.horizontal.repeat(w + 2)).join(b.cross) + b.teeLeft;

    // Bottom border: └───┴───┘
    const botRow =
      b.bottomLeft + colWidths.map((w) => b.horizontal.repeat(w + 2)).join(b.teeUp) + b.bottomRight;

    const lines: string[] = [formatter.border(topRow)];

    // Render Headers
    if (node.headers.length > 0) {
      const headerCells = node.headers.map((h, i) => {
        const width = colWidths[i] || 5;
        const text = padRight(h.slice(0, width), width);
        return formatter.subheading(text);
      });
      lines.push(`${formatter.border(b.vertical)} ${headerCells.join(` ${formatter.border(b.vertical)} `)} ${formatter.border(b.vertical)}`);
      lines.push(formatter.border(midRow));
    }

    // Render Rows
    for (const row of node.rows) {
      const cells = [];
      for (let c = 0; c < colCount; c++) {
        const width = colWidths[c] || 5;
        const rawCell = row[c] || '';
        const text = padRight(rawCell.slice(0, width), width);
        cells.push(formatter.text(text));
      }
      lines.push(`${formatter.border(b.vertical)} ${cells.join(` ${formatter.border(b.vertical)} `)} ${formatter.border(b.vertical)}`);
    }

    lines.push(formatter.border(botRow));
    return lines.join('\n');
  }
}

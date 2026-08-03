import type { ListNode, TaskListNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { wrapText } from '../utils/word-wrap.js';

export class ListComponent implements RenderComponent<ListNode> {
  public render(node: ListNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const lines: string[] = [];
    let counter = node.start || 1;

    for (const item of node.items) {
      let prefix = '';
      if (item.checked !== undefined) {
        prefix = item.checked ? formatter.colorHex('#4ade80', '☑ ') : formatter.dim('☐ ');
      } else if (node.ordered) {
        prefix = formatter.dim(`${counter++}. `);
      } else {
        prefix = formatter.colorHex('#06b6d4', '• ');
      }

      const itemText = item.text || (item.children ? item.children.map((c) => (c.type === 'text' ? c.text : '')).join('') : '');
      const wrapped = wrapText(itemText, maxWidth - 4);

      if (wrapped.length > 0) {
        lines.push(`${prefix}${wrapped[0]}`);
        for (let i = 1; i < wrapped.length; i++) {
          lines.push(`   ${wrapped[i]}`);
        }
      }
    }

    return lines.join('\n');
  }
}

export class TaskListComponent implements RenderComponent<TaskListNode> {
  public render(node: TaskListNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const lines: string[] = [];

    for (const item of node.items) {
      const icon = item.checked ? formatter.colorHex('#4ade80', '☑ ') : formatter.dim('☐ ');
      const wrapped = wrapText(item.text, maxWidth - 4);
      if (wrapped.length > 0) {
        lines.push(`${icon}${wrapped[0]}`);
        for (let i = 1; i < wrapped.length; i++) {
          lines.push(`   ${wrapped[i]}`);
        }
      }
    }

    return lines.join('\n');
  }
}

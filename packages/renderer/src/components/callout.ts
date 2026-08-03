import type { CalloutNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';
import { wrapText } from '../utils/word-wrap.js';

export class CalloutComponent implements RenderComponent<CalloutNode> {
  public render(node: CalloutNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const kind = node.calloutType || 'note';

    let icon = 'ℹ️ ';
    let colorHex = '#38bdf8';
    let title = 'NOTE';

    if (kind === 'tip') {
      icon = '💡 ';
      colorHex = '#34d399';
      title = 'TIP';
    } else if (kind === 'important') {
      icon = '❗ ';
      colorHex = '#c084fc';
      title = 'IMPORTANT';
    } else if (kind === 'warning') {
      icon = '⚠️ ';
      colorHex = '#fbbf24';
      title = 'WARNING';
    } else if (kind === 'caution') {
      icon = '🚨 ';
      colorHex = '#f87171';
      title = 'CAUTION';
    }

    const header = `${icon}${formatter.colorHex(colorHex, formatter.bold(title))}`;
    const borderChar = formatter.colorHex(colorHex, '│ ');
    const wrapped = wrapText(node.text, maxWidth - 4);
    const lines = wrapped.map((line) => `${borderChar}${line}`);

    return `${header}\n${lines.join('\n')}`;
  }

  public measure(node: CalloutNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: CalloutNode, delta?: Partial<CalloutNode>): CalloutNode {
    return { ...node, ...delta };
  }
}

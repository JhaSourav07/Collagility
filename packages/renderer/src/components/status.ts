import type { StatusNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';

export class StatusComponent implements RenderComponent<StatusNode> {
  public render(node: StatusNode, context: ComponentContext): string {
    const { formatter } = context;
    const state = node.state || 'connected';
    const text = node.message || '';

    let prefix = '● ';
    let colorHex = '#34d399';

    if (state === 'disconnected') {
      prefix = '○ ';
      colorHex = '#9ca3af';
    } else if (state === 'syncing') {
      prefix = '◐ ';
      colorHex = '#38bdf8';
    } else if (state === 'error') {
      prefix = '✖ ';
      colorHex = '#f87171';
    }

    return `${formatter.colorHex(colorHex, prefix)}${formatter.dim(text)}`;
  }

  public measure(node: StatusNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: StatusNode, delta?: Partial<StatusNode>): StatusNode {
    return { ...node, ...delta };
  }
}

import type { ToolActionNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';

export class ToolActionComponent implements RenderComponent<ToolActionNode> {
  public render(node: ToolActionNode, context: ComponentContext): string {
    const { formatter } = context;
    const name = node.name || 'Action';
    const targetStr = node.target ? `(${node.target})` : '()';
    const state = node.state || 'running';

    let icon = '● ';
    let iconColor = '#38bdf8'; // Cyan for active

    if (state === 'pending') {
      icon = '● ';
      iconColor = '#9ca3af'; // Gray
    } else if (state === 'running') {
      icon = '● ';
      iconColor = '#38bdf8'; // Cyan
    } else if (state === 'success') {
      icon = '✓ ';
      iconColor = '#34d399'; // Green
    } else if (state === 'error') {
      icon = '✖ ';
      iconColor = '#f87171'; // Red
    } else if (state === 'skipped') {
      icon = '↷ ';
      iconColor = '#fbbf24'; // Yellow
    }

    const styledIcon = formatter.colorHex(iconColor, icon);
    const styledAction = formatter.text(`${name}${targetStr}`);

    if (state === 'success') {
      return `${styledIcon}${formatter.dim(`${name}${targetStr}`)}`;
    }

    return `${styledIcon}${styledAction}`;
  }

  public measure(node: ToolActionNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: ToolActionNode, delta?: Partial<ToolActionNode>): ToolActionNode {
    return { ...node, ...delta };
  }
}

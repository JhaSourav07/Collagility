import type { ThoughtNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';

export class ThoughtComponent implements RenderComponent<ThoughtNode> {
  public render(node: ThoughtNode, context: ComponentContext): string {
    const { formatter } = context;
    const duration = node.durationSeconds ? `Thought for ${node.durationSeconds.toFixed(1)}s` : 'Thinking...';
    const summary = node.summaryText ? `\n${node.summaryText}` : '';

    const header = formatter.colorHex('#c084fc', formatter.italic(`▸ ${duration}`));
    const body = summary ? formatter.dim(summary) : '';

    return `${header}${body}`;
  }

  public measure(node: ThoughtNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: ThoughtNode, delta?: Partial<ThoughtNode>): ThoughtNode {
    return { ...node, ...delta };
  }
}

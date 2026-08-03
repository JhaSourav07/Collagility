import type { BadgeNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';

export class BadgeComponent implements RenderComponent<BadgeNode> {
  public render(node: BadgeNode, context: ComponentContext): string {
    const { formatter } = context;
    const variant = node.variant || 'info';
    const label = node.label || 'BADGE';

    if (variant === 'owner') {
      return formatter.colorHex('#34d399', `[ ${label.toUpperCase()} ]`);
    }
    if (variant === 'visitor') {
      return formatter.colorHex('#60a5fa', `[ ${label.toUpperCase()} ]`);
    }
    if (variant === 'model') {
      return formatter.colorHex('#c084fc', `[ ${label} ]`);
    }
    if (variant === 'status') {
      return formatter.colorHex('#fbbf24', `[ ${label} ]`);
    }

    return formatter.colorHex('#9ca3af', `[ ${label} ]`);
  }

  public measure(node: BadgeNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: BadgeNode, delta?: Partial<BadgeNode>): BadgeNode {
    return { ...node, ...delta };
  }
}

import type { HorizontalRuleNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';
import { BOX_SYMBOLS } from '../ansi/formatter.js';

export class HorizontalRuleComponent implements RenderComponent<HorizontalRuleNode> {
  public render(_node: HorizontalRuleNode, context: ComponentContext): string {
    const { maxWidth, formatter } = context;
    const char = BOX_SYMBOLS.single.horizontal;
    return formatter.border(char.repeat(maxWidth));
  }
}

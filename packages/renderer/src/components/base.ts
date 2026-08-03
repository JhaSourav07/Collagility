import type { RenderTheme } from '../theme/theme.js';
import type { ANSIFormatter } from '../ansi/formatter.js';
import type { ASTNode } from '../ast/nodes.js';

export interface ComponentContext {
  maxWidth: number;
  theme: RenderTheme;
  formatter: ANSIFormatter;
  depth?: number;
}

export interface RenderComponent<T extends ASTNode = ASTNode> {
  render(node: T, context: ComponentContext): string;
}

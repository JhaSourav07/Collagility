import type { RenderTheme } from '../theme/theme.js';
import type { ANSIFormatter } from '../ansi/formatter.js';
import type { ASTNode } from '../ast/nodes.js';

export interface ComponentContext {
  maxWidth: number;
  theme: RenderTheme;
  formatter: ANSIFormatter;
  depth?: number;
}

export interface ComponentDimensions {
  width: number;
  height: number;
}

export interface RenderComponent<T extends ASTNode = ASTNode> {
  render(node: T, context: ComponentContext): string;
  measure?(node: T, context: ComponentContext): ComponentDimensions;
  update?(node: T, delta?: Partial<T>): T;
}

export function measureComponentText(renderedText: string): ComponentDimensions {
  const lines = renderedText.split(/\r?\n/);
  let maxW = 0;
  for (const l of lines) {
    // Strip ANSI codes for width measurement
    const clean = l.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    if (clean.length > maxW) maxW = clean.length;
  }
  return {
    width: maxW,
    height: lines.length,
  };
}

import { describe, it, expect } from 'vitest';
import { ANSIFormatter } from '../ansi/formatter.js';
import { darkTheme } from '../theme/theme.js';
import type { ComponentContext } from '../components/base.js';
import { ToolActionComponent } from '../components/tool-action.js';
import { ThoughtComponent } from '../components/thought.js';
import type { ToolActionNode } from '../ast/nodes.js';

describe('AGY Style Tool Timeline & State Machine Suite', () => {
  const context: ComponentContext = {
    maxWidth: 80,
    theme: darkTheme,
    formatter: new ANSIFormatter(darkTheme),
  };

  it('ToolActionComponent: renders pending, running, success, error, and skipped states', () => {
    const comp = new ToolActionComponent();
    let node: ToolActionNode = {
      type: 'tool_action',
      name: 'Read',
      target: 'server.ts',
      state: 'pending',
    };

    // 1. Pending
    expect(comp.render(node, context)).toContain('● ');
    expect(comp.render(node, context)).toContain('Read(server.ts)');

    // 2. Running
    node = comp.update(node, { state: 'running' });
    expect(comp.render(node, context)).toContain('● ');

    // 3. Success
    node = comp.update(node, { state: 'success' });
    expect(comp.render(node, context)).toContain('✓ ');

    // 4. Error
    node = comp.update(node, { state: 'error' });
    expect(comp.render(node, context)).toContain('✖ ');

    // 5. Skipped
    node = comp.update(node, { state: 'skipped' });
    expect(comp.render(node, context)).toContain('↷ ');
  });

  it('ToolActionComponent: supports Read, Search, Edit, Write, Delete actions', () => {
    const comp = new ToolActionComponent();
    const actions: Array<'Read' | 'Search' | 'Edit' | 'Write' | 'Delete'> = [
      'Read',
      'Search',
      'Edit',
      'Write',
      'Delete',
    ];

    for (const act of actions) {
      const rendered = comp.render(
        { type: 'tool_action', name: act, target: 'main.ts', state: 'running' },
        context
      );
      expect(rendered).toContain(act);
      expect(rendered).toContain('(main.ts)');
    }
  });

  it('ThoughtComponent: renders duration headers and summary text', () => {
    const comp = new ThoughtComponent();
    const node = {
      type: 'thought' as const,
      durationSeconds: 1.4,
      summaryText: 'Tracing authentication flow...',
    };

    const rendered = comp.render(node, context);
    expect(rendered).toContain('▸ Thought for 1.4s');
    expect(rendered).toContain('Tracing authentication flow...');

    const dims = comp.measure(node, context);
    expect(dims.height).toBe(2);
  });
});

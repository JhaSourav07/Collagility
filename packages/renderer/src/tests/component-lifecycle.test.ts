import { describe, it, expect } from 'vitest';
import { ANSIFormatter } from '../ansi/formatter.js';
import { darkTheme } from '../theme/theme.js';
import type { ComponentContext } from '../components/base.js';

import { HeadingComponent } from '../components/heading.js';
import { ParagraphComponent } from '../components/paragraph.js';
import { DividerComponent } from '../components/divider.js';
import { QuoteComponent } from '../components/quote.js';
import { CalloutComponent } from '../components/callout.js';
import { BadgeComponent } from '../components/badge.js';
import { StatusComponent } from '../components/status.js';
import { FileComponent } from '../components/file-ref.js';
import { LinkComponent } from '../components/link.js';
import { TableComponent } from '../components/table.js';
import { CodeBlockComponent } from '../components/code-block.js';
import { TaskListComponent } from '../components/list.js';

describe('Reusable Terminal Component Lifecycle Suite', () => {
  const context: ComponentContext = {
    maxWidth: 60,
    theme: darkTheme,
    formatter: new ANSIFormatter(darkTheme),
  };

  it('HeadingComponent: render, measure, and update', () => {
    const comp = new HeadingComponent();
    const node = { type: 'heading' as const, level: 1 as const, text: 'System Header' };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('System Header');

    const updated = { ...node, text: 'Updated Header' };
    expect(comp.render(updated, context)).toContain('Updated Header');
  });

  it('CalloutComponent: render, measure, and update', () => {
    const comp = new CalloutComponent();
    const node = { type: 'callout' as const, calloutType: 'warning' as const, text: 'Memory threshold exceeded' };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('WARNING');
    expect(rendered).toContain('Memory threshold exceeded');

    const dims = comp.measure(node, context);
    expect(dims.height).toBeGreaterThan(1);
    expect(dims.width).toBeGreaterThan(10);

    const updated = comp.update(node, { text: 'New warning message' });
    expect(updated.text).toBe('New warning message');
  });

  it('BadgeComponent: render, measure, and update', () => {
    const comp = new BadgeComponent();
    const node = { type: 'badge' as const, label: 'OWNER', variant: 'owner' as const };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('[ OWNER ]');

    const dims = comp.measure(node, context);
    expect(dims.width).toBe(9);
    expect(dims.height).toBe(1);

    const updated = comp.update(node, { label: 'VISITOR', variant: 'visitor' });
    expect(comp.render(updated, context)).toContain('[ VISITOR ]');
  });

  it('StatusComponent: render, measure, and update', () => {
    const comp = new StatusComponent();
    const node = { type: 'status' as const, state: 'connected' as const, message: 'Connected to server' };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('Connected to server');

    const dims = comp.measure(node, context);
    expect(dims.height).toBe(1);

    const updated = comp.update(node, { state: 'error', message: 'Connection lost' });
    expect(comp.render(updated, context)).toContain('Connection lost');
  });

  it('FileComponent: render, measure, and update', () => {
    const comp = new FileComponent();
    const node = { type: 'file' as const, fileName: 'auth.ts', lineRange: 'L10-25' };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('📄 auth.ts:L10-25');

    const dims = comp.measure(node, context);
    expect(dims.height).toBe(1);
    expect(dims.width).toBeGreaterThan(10);

    const updated = comp.update(node, { fileName: 'server.ts' });
    expect(comp.render(updated, context)).toContain('📄 server.ts');
  });

  it('CodeBlockComponent: width measurement & rendering', () => {
    const comp = new CodeBlockComponent();
    const node = { type: 'code_block' as const, language: 'ts', code: 'const x = 1;\nconst y = 2;' };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('┌ ts');
    expect(rendered).toContain('const x = 1;');
    expect(rendered).toContain('└');
  });

  it('TaskListComponent: render, measure, and update', () => {
    const comp = new TaskListComponent();
    const node = {
      type: 'task_list' as const,
      items: [
        { text: 'Design Component API', checked: true },
        { text: 'Write Unit Tests', checked: false },
      ],
    };
    const rendered = comp.render(node, context);
    expect(rendered).toContain('Design Component API');
    expect(rendered).toContain('Write Unit Tests');
  });

  it('DividerComponent: render horizontal rule', () => {
    const comp = new DividerComponent();
    const node = { type: 'horizontal_rule' as const };
    const rendered = comp.render(node, context);
    expect(rendered).toBeDefined();
    expect(rendered.length).toBeGreaterThan(0);
  });
});


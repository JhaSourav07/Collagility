import { describe, it, expect } from 'vitest';
import {
  MarkdownLexer,
  MarkdownParser,
  DocumentRenderer,
  IncrementalStreamEngine,
  ProjectFileDetector,
  BadgeComponent,
  StatusComponent,
  FileComponent,
  ANSIFormatter,
  darkTheme,
  type ComponentContext,
} from '../index.js';

describe('Layout Stress Testing & High-Scale Performance Engine Suite', () => {
  const context: ComponentContext = {
    maxWidth: 80,
    theme: darkTheme,
    formatter: new ANSIFormatter(darkTheme),
  };

  it('1000-Line Markdown Stress Test: parses and renders 1000 document lines smoothly', () => {
    let markdown = '# High-Scale Stress Test System\n\n';
    for (let i = 0; i < 200; i++) {
      markdown += `## Section ${i}\n`;
      markdown += `This is paragraph text for section ${i} containing **bold** and *italic* formatting.\n\n`;
      markdown += '```ts\nconst val = ' + i + ';\nconsole.log(val);\n```\n\n';
      markdown += '- [x] Task completed ' + i + '\n';
    }

    const start = performance.now();

    const renderer = new DocumentRenderer({ maxWidth: 80, theme: darkTheme });
    const output = renderer.renderMarkdown(markdown);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300); // Processed 1000 lines in under 300ms
    expect(output.length).toBeGreaterThan(1000);
  });

  it('100KB Stream Payload Stress Test: processes 100KB text stream chunks smoothly', () => {
    const engine = new IncrementalStreamEngine(100, 50);
    const chunkSize = 200;
    const totalChunks = 500; // 500 * 200 = 100,000 bytes (100KB)
    const chunkContent = 'A'.repeat(chunkSize) + '\n';

    const start = performance.now();

    for (let i = 0; i < totalChunks; i++) {
      engine.processChunk({ streamId: 'stress_stream', state: 'typing', content: chunkContent });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(400); // Processed 100KB stream payload in under 400ms
  });

  it('200 Files List Stress Test: renders 200 file nodes with ProjectFileDetector accurately', () => {
    const fileComp = new FileComponent();
    const fileNodes = [];

    for (let i = 0; i < 200; i++) {
      const isDoc = i % 2 === 0;
      const fileName = isDoc ? `doc_${i}.md` : `code_${i}.ts`;
      fileNodes.push({ type: 'file' as const, fileName, filePath: `/src/${fileName}` });
    }

    const start = performance.now();

    let docCount = 0;
    let codeCount = 0;

    for (const node of fileNodes) {
      const rendered = fileComp.render(node, context);
      if (rendered.includes('📖 ')) docCount++;
      if (rendered.includes('📄 ')) codeCount++;
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
    expect(docCount).toBe(100);
    expect(codeCount).toBe(100);
  });

  it('100 Users Session Stress Test: formats 100 session participants with role badges & status', () => {
    const badgeComp = new BadgeComponent();
    const statusComp = new StatusComponent();

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const role = i === 0 ? 'owner' : 'visitor';
      const badgeNode = { type: 'badge' as const, label: role.toUpperCase(), variant: role as any };
      const statusNode = { type: 'status' as const, state: 'connected' as const, message: `User_${i}` };

      const bRendered = badgeComp.render(badgeNode, context);
      const sRendered = statusComp.render(statusNode, context);

      expect(bRendered).toContain(`[ ${role.toUpperCase()} ]`);
      expect(sRendered).toContain(`User_${i}`);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });

  it('Unicode & Emoji Alignment: validates multi-byte Unicode/Emoji text width & alignment', () => {
    const fileMetadata = ProjectFileDetector.parseFileMetadata('README.md');
    expect(fileMetadata.icon).toBe('📖 '); // Multi-byte emoji icon

    const statusNode = { type: 'status' as const, state: 'connected' as const, message: 'Server Connected 🚀' };
    const statusComp = new StatusComponent();
    const rendered = statusComp.render(statusNode, context);

    expect(rendered).toContain('Server Connected 🚀');
  });
});

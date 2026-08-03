import { describe, it, expect } from 'vitest';
import { ProjectFileDetector } from '../utils/file-detector.js';
import { FileComponent } from '../components/file-ref.js';
import { ANSIFormatter } from '../ansi/formatter.js';
import { darkTheme } from '../theme/theme.js';
import type { ComponentContext } from '../components/base.js';

describe('Project File Detection & Interactive Metadata Suite', () => {
  const context: ComponentContext = {
    maxWidth: 80,
    theme: darkTheme,
    formatter: new ANSIFormatter(darkTheme),
  };

  it('detects gateway.ts, auth.ts as code files (📄) and README.md as doc file (📖)', () => {
    const metaGateway = ProjectFileDetector.parseFileMetadata('apps/server/src/gateway.ts');
    expect(metaGateway.fileName).toBe('gateway.ts');
    expect(metaGateway.isCode).toBe(true);
    expect(metaGateway.isDoc).toBe(false);
    expect(metaGateway.icon).toBe('📄 ');
    expect(metaGateway.clickable).toBe(true);

    const metaAuth = ProjectFileDetector.parseFileMetadata('apps/server/src/auth.ts');
    expect(metaAuth.fileName).toBe('auth.ts');
    expect(metaAuth.isCode).toBe(true);
    expect(metaAuth.icon).toBe('📄 ');

    const metaReadme = ProjectFileDetector.parseFileMetadata('README.md');
    expect(metaReadme.fileName).toBe('README.md');
    expect(metaReadme.isDoc).toBe(true);
    expect(metaReadme.isCode).toBe(false);
    expect(metaReadme.icon).toBe('📖 ');
    expect(metaReadme.clickable).toBe(true);
  });

  it('detects standalone files from raw text input', () => {
    const text = 'Check gateway.ts and auth.ts then read README.md for details.';
    const detected = ProjectFileDetector.detectStandaloneFiles(text);
    expect(detected.length).toBe(3);
    expect(detected[0].fileName).toBe('gateway.ts');
    expect(detected[1].fileName).toBe('auth.ts');
    expect(detected[2].fileName).toBe('README.md');
  });

  it('FileComponent renders code files as 📄 gateway.ts and doc files as 📖 README.md', () => {
    const comp = new FileComponent();

    const codeNode = { type: 'file' as const, fileName: 'gateway.ts', filePath: 'apps/server/src/gateway.ts' };
    const codeRendered = comp.render(codeNode, context);
    expect(codeRendered).toContain('📄 gateway.ts');

    const docNode = { type: 'file' as const, fileName: 'README.md', filePath: 'README.md' };
    const docRendered = comp.render(docNode, context);
    expect(docRendered).toContain('📖 README.md');
  });
});

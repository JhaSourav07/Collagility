import { describe, it, expect } from 'vitest';
import { DocumentRenderer } from '../renderer/document-renderer.js';

describe('DocumentRenderer', () => {
  it('renders markdown document into ANSI output without raw markdown tags', () => {
    const renderer = new DocumentRenderer({ maxWidth: 60 });
    const markdown = `# Authentication\n## JWT\n\nJWT allows stateless authentication.\n\n\`\`\`ts\nconst token = jwt.sign(...)\n\`\`\`\n\nRead more in [auth.ts](apps/server/src/auth.ts)`;
    const output = renderer.renderMarkdown(markdown);

    expect(output).toContain('Authentication');
    expect(output).toContain('JWT');
    expect(output).toContain('const token = jwt.sign(...)');
    expect(output).toContain('📄 auth.ts');
  });

  it('renders tables with unicode borders', () => {
    const renderer = new DocumentRenderer({ maxWidth: 60 });
    const markdown = '| Feature | Status |\n| --- | --- |\n| Lexer | Ready |';
    const output = renderer.renderMarkdown(markdown);

    expect(output).toContain('┌');
    expect(output).toContain('Feature');
    expect(output).toContain('Status');
    expect(output).toContain('Lexer');
    expect(output).toContain('Ready');
    expect(output).toContain('└');
  });
});

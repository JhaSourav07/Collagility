import path from 'path';

export interface ExtractedLink {
  text: string;
  url: string;
  isFileRef: boolean;
  filePath?: string;
}

export interface ProjectFileMetadata {
  rawMatch: string;
  fileName: string;
  filePath: string;
  extension: string;
  isDoc: boolean;
  isCode: boolean;
  icon: string;
  lineRange?: string;
  clickable: boolean;
}

export class ProjectFileDetector {
  private static CODE_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.py',
    '.go',
    '.rs',
    '.css',
    '.html',
    '.yml',
    '.yaml',
    '.sh',
    '.c',
    '.cpp',
    '.h',
  ]);

  private static DOC_EXTENSIONS = new Set([
    '.md',
    '.markdown',
    '.txt',
    '.rst',
    '.doc',
    '.pdf',
  ]);

  public static parseFileMetadata(input: string): ProjectFileMetadata {
    const cleanPath = input.replace(/^file:\/\//, '').trim();
    const hashIndex = cleanPath.indexOf('#');
    const pathWithoutHash = hashIndex !== -1 ? cleanPath.slice(0, hashIndex) : cleanPath;
    const lineRange = hashIndex !== -1 ? cleanPath.slice(hashIndex + 1) : undefined;

    const ext = path.extname(pathWithoutHash).toLowerCase();
    const fileName = path.basename(pathWithoutHash);

    const isDoc = this.DOC_EXTENSIONS.has(ext);
    const isCode = this.CODE_EXTENSIONS.has(ext) || (!isDoc && ext.length > 0);
    const icon = isDoc ? '📖 ' : '📄 ';

    return {
      rawMatch: input,
      fileName,
      filePath: cleanPath,
      extension: ext,
      isDoc,
      isCode,
      icon,
      lineRange,
      clickable: true,
    };
  }

  public static detectStandaloneFiles(text: string): ProjectFileMetadata[] {
    const results: ProjectFileMetadata[] = [];
    const fileRegex = /\b([a-zA-Z0-9_\-\/]+\.(ts|tsx|js|jsx|json|md|py|go|rs|css|html|yml|yaml|txt))\b/g;
    let match: RegExpExecArray | null;

    while ((match = fileRegex.exec(text)) !== null) {
      results.push(this.parseFileMetadata(match[1]));
    }

    return results;
  }
}

export function detectFileReferences(text: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const textLabel = match[1];
    const targetUrl = match[2];

    const isFile =
      targetUrl.startsWith('file://') ||
      targetUrl.includes('/') ||
      /\.(ts|tsx|js|jsx|json|md|py|go|rs|css|html|yml|yaml)$/i.test(targetUrl);

    links.push({
      text: textLabel,
      url: targetUrl,
      isFileRef: isFile,
      filePath: isFile ? targetUrl.replace(/^file:\/\//, '') : undefined,
    });
  }

  return links;
}

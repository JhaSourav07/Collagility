export interface ExtractedLink {
  text: string;
  url: string;
  isFileRef: boolean;
  filePath?: string;
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

// Regex to strip ANSI escape codes for measuring visible width
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

export function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (visibleLength(paragraph) <= maxWidth) {
      lines.push(paragraph);
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else {
        const testLine = `${currentLine} ${word}`;
        if (visibleLength(testLine) <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

export function padRight(str: string, width: number, char = ' '): string {
  const len = visibleLength(str);
  if (len >= width) return str;
  return str + char.repeat(width - len);
}

export function padLeft(str: string, width: number, char = ' '): string {
  const len = visibleLength(str);
  if (len >= width) return str;
  return char.repeat(width - len) + str;
}

export function centerText(str: string, width: number, char = ' '): string {
  const len = visibleLength(str);
  if (len >= width) return str;
  const leftPad = Math.floor((width - len) / 2);
  const rightPad = width - len - leftPad;
  return char.repeat(leftPad) + str + char.repeat(rightPad);
}

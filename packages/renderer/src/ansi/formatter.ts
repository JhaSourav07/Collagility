import chalk from 'chalk';
import type { RenderTheme } from '../theme/theme.js';

export const BOX_SYMBOLS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    teeDown: '┬',
    teeUp: '┴',
    teeRight: '├',
    teeLeft: '┤',
  },
  heavy: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    cross: '╋',
    teeDown: '┳',
    teeUp: '┻',
    teeRight: '┣',
    teeLeft: '┫',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    cross: '╬',
    teeDown: '╦',
    teeUp: '╩',
    teeRight: '╠',
    teeLeft: '╣',
  },
};

export class ANSIFormatter {
  private theme: RenderTheme;

  constructor(theme: RenderTheme) {
    this.theme = theme;
  }

  public colorHex(hex: string, text: string): string {
    return chalk.hex(hex)(text);
  }

  public heading(text: string): string {
    return chalk.hex(this.theme.colors.heading).bold(text);
  }

  public subheading(text: string): string {
    return chalk.hex(this.theme.colors.subheading).bold(text);
  }

  public text(text: string): string {
    return chalk.hex(this.theme.colors.text)(text);
  }

  public bold(text: string): string {
    return chalk.bold(text);
  }

  public italic(text: string): string {
    return chalk.italic(text);
  }

  public code(text: string): string {
    return chalk.bgHex('#1e293b').hex(this.theme.colors.code)(` ${text} `);
  }

  public link(text: string): string {
    return chalk.hex(this.theme.colors.link).underline(text);
  }

  public fileRef(text: string): string {
    return chalk.hex(this.theme.colors.fileRef).bold(`📄 ${text}`);
  }

  public webLink(text: string, url: string): string {
    return chalk.hex(this.theme.colors.link)(`🌐 ${text} (${url})`);
  }

  public border(text: string): string {
    return chalk.hex(this.theme.colors.border)(text);
  }

  public quoteBorder(text: string): string {
    return chalk.hex(this.theme.colors.quoteBorder)(text);
  }

  public dim(text: string): string {
    return chalk.hex(this.theme.colors.dim)(text);
  }
}

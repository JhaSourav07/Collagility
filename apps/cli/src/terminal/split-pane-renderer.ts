import chalk from 'chalk';
import { colors } from './colors.js';

export interface SplitPaneOptions {
  splitRatio?: number; // default 0.45 (45% left, 55% right)
  chatTitle?: string;
  ptyTitle?: string;
}

export type PaneFocus = 'chat' | 'pty';

export class SplitTerminalRenderer {
  private splitRatio: number;
  private chatTitle: string;
  private ptyTitle: string;
  private focus: PaneFocus = 'chat';

  private chatBuffer: string[] = [];
  private ptyBuffer: string[] = [];
  private currentInput = '';

  private maxChatHistory = 100;
  private maxPtyHistory = 200;

  constructor(options: SplitPaneOptions = {}) {
    this.splitRatio = options.splitRatio ?? 0.45;
    this.chatTitle = options.chatTitle ?? '💬 CHAT & COLLABORATION';
    this.ptyTitle = options.ptyTitle ?? '🤖 NATIVE AI VIEW (PTY)';
  }

  public get currentFocus(): PaneFocus {
    return this.focus;
  }

  public setFocus(focus: PaneFocus): void {
    this.focus = focus;
    this.render();
  }

  public toggleFocus(): PaneFocus {
    this.focus = this.focus === 'chat' ? 'pty' : 'chat';
    this.render();
    return this.focus;
  }

  public appendChat(line: string): void {
    const lines = line.split('\n');
    for (const l of lines) {
      this.chatBuffer.push(l);
    }
    if (this.chatBuffer.length > this.maxChatHistory) {
      this.chatBuffer = this.chatBuffer.slice(this.chatBuffer.length - this.maxChatHistory);
    }
    this.render();
  }

  public appendPtyData(data: string): void {
    const cleaned = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n');
    for (const l of lines) {
      this.ptyBuffer.push(l);
    }
    if (this.ptyBuffer.length > this.maxPtyHistory) {
      this.ptyBuffer = this.ptyBuffer.slice(this.ptyBuffer.length - this.maxPtyHistory);
    }
    this.render();
  }

  public setInput(input: string): void {
    this.currentInput = input;
    this.render();
  }

  public clearPty(): void {
    this.ptyBuffer = [];
    this.render();
  }

  public render(): void {
    if (!process.stdout.isTTY) return;

    const totalCols = process.stdout.columns || 120;
    const totalRows = process.stdout.rows || 30;

    const leftCols = Math.max(20, Math.floor(totalCols * this.splitRatio));
    const rightCols = Math.max(20, totalCols - leftCols - 1);
    const contentRows = Math.max(5, totalRows - 4); // 1 header, 1 subheader, contentRows, 1 divider, 1 footer input

    // Header bar
    const leftHeaderStr = ` ${this.chatTitle} `.padEnd(leftCols).slice(0, leftCols);
    const rightHeaderStr = ` ${this.ptyTitle} `.padEnd(rightCols).slice(0, rightCols);

    const leftHeaderFormatted =
      this.focus === 'chat'
        ? chalk.bgCyan.black.bold(leftHeaderStr)
        : chalk.bgBlue.white(leftHeaderStr);

    const rightHeaderFormatted =
      this.focus === 'pty'
        ? chalk.bgCyan.black.bold(rightHeaderStr)
        : chalk.bgBlue.white(rightHeaderStr);

    const headerLine = `${leftHeaderFormatted}│${rightHeaderFormatted}`;

    // Subheader / Status Line
    const leftFocusTag = this.focus === 'chat' ? colors.green('[ACTIVE FOCUS]') : colors.dim('[Press TAB to focus]');
    const rightFocusTag = this.focus === 'pty' ? colors.green('[ACTIVE FOCUS]') : colors.dim('[Press TAB to focus]');

    const subLeft = ` ${leftFocusTag}`.padEnd(leftCols + 10).slice(0, leftCols + 10);
    const subRight = ` ${rightFocusTag}`.padEnd(rightCols + 10).slice(0, rightCols + 10);
    const subheaderLine = `${subLeft}│${subRight}`;

    // Prepare viewport slice
    const visibleChat = this.chatBuffer.slice(-contentRows);
    const visiblePty = this.ptyBuffer.slice(-contentRows);

    const bodyLines: string[] = [];

    for (let r = 0; r < contentRows; r++) {
      const chatLine = visibleChat[r] ?? '';
      const ptyLine = visiblePty[r] ?? '';

      const truncatedChat = this.stripAnsiAndPad(chatLine, leftCols);
      const truncatedPty = this.stripAnsiAndPad(ptyLine, rightCols);

      bodyLines.push(`${truncatedChat}│${truncatedPty}`);
    }

    // Horizontal divider above input
    const lineDivider = '─'.repeat(totalCols);

    // Footer input bar
    const focusHelp =
      this.focus === 'chat'
        ? colors.cyan('💬 Focus: Chat Input') + colors.dim(' (Press TAB for PTY)')
        : colors.magenta('🤖 Focus: Native PTY Keypresses') + colors.dim(' (Press TAB for Chat)');

    const promptText = `> ${this.currentInput}`;
    const footerLine = `${promptText.padEnd(totalCols - 35).slice(0, totalCols - 35)} │ ${focusHelp}`;

    // Frame output assembly using ANSI screen home \x1b[H
    const frame = ['\x1b[H', headerLine, subheaderLine, ...bodyLines, lineDivider, footerLine].join('\n');
    process.stdout.write(frame);
  }

  private stripAnsiAndPad(text: string, width: number): string {
    const plain = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    if (plain.length >= width) {
      return text.slice(0, width);
    }
    return text + ' '.repeat(width - plain.length);
  }
}

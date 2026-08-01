import chalk from 'chalk';

export interface SplitPaneOptions {
  sessionId?: string;
  isOwner?: boolean;
  memberCount?: number;
  workspacePath?: string;
  aiAdapter?: string;
  aiModel?: string;
}

export type PaneFocus = 'chat' | 'pty';

export class SplitTerminalRenderer {
  private sessionId = '';
  private isOwner = true;
  private memberCount = 1;
  private workspacePath = process.cwd();
  private aiAdapter = 'agi';
  private headerRendered = false;

  constructor(options: SplitPaneOptions = {}) {
    if (options.sessionId) this.sessionId = options.sessionId;
    if (options.isOwner !== undefined) this.isOwner = options.isOwner;
    if (options.memberCount !== undefined) this.memberCount = options.memberCount;
    if (options.workspacePath) this.workspacePath = options.workspacePath;
    if (options.aiAdapter) this.aiAdapter = options.aiAdapter;
  }

  public setSessionInfo(sessionId: string, isOwner: boolean, memberCount: number, workspacePath?: string): void {
    this.sessionId = sessionId;
    this.isOwner = isOwner;
    this.memberCount = memberCount;
    if (workspacePath) this.workspacePath = workspacePath;
    this.renderHeader();
  }

  public setAiInfo(adapter: string, _model?: string, _status?: string): void {
    this.aiAdapter = adapter;
  }

  public get currentFocus(): PaneFocus {
    return 'chat';
  }

  public setFocus(_focus: PaneFocus): void {}
  public toggleFocus(): PaneFocus { return 'chat'; }

  public renderHeader(): void {
    if (this.headerRendered) return;
    this.headerRendered = true;

    const badge = this.isOwner
      ? chalk.bgHex('#059669').black.bold(' OWNER ')
      : chalk.bgHex('#2563eb').white.bold(' MEMBER ');

    console.log('');
    console.log(chalk.cyan.bold('⚡ COLLAGILITY CLI') + chalk.gray(' v0.1.0-alpha.6'));
    console.log(chalk.gray('─────────────────────────────────────────────────────────────'));
    console.log(`  ${chalk.bold('Session:')}   ${chalk.yellow.bold(this.sessionId || 'active')} ${badge} ${chalk.gray(`(${this.memberCount} active)`)}`);
    console.log(`  ${chalk.bold('Workspace:')} ${chalk.blue(this.workspacePath)}`);
    console.log(`  ${chalk.bold('AI Engine:')} ${chalk.magenta.bold(this.aiAdapter)} ${chalk.gray('(Stream Relay Active)')}`);
    console.log(chalk.gray('─────────────────────────────────────────────────────────────'));
    console.log(chalk.dim('  Type ') + chalk.magenta('@agi <prompt>') + chalk.dim(' for AI, or type message to chat.'));
    console.log(chalk.dim('  Shortcut: ') + chalk.cyan('Ctrl+O') + chalk.dim(' — Toggle AI thinking steps (expand/collapse)\n'));
  }

  public appendChat(line: string): void {
    if (!this.headerRendered) this.renderHeader();
    console.log(line);
  }

  public appendPtyData(data: string): void {
    if (!this.headerRendered) this.renderHeader();
    process.stdout.write(data);
  }

  public setInput(_input: string): void {}

  public clearPty(): void {}

  public render(): void {}
}

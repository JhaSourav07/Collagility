import chalk from 'chalk';
import { InkTerminalRenderer } from './ink-renderer.js';

export { InkTerminalRenderer };

export interface SplitPaneOptions {
  sessionId?: string;
  isOwner?: boolean;
  memberCount?: number;
  workspacePath?: string;
  aiAdapter?: string;
  aiModel?: string;
  ownerName?: string;
}

export type PaneFocus = 'chat' | 'pty';

export class SplitTerminalRenderer {
  private sessionId = '';
  private isOwner = true;
  private memberCount = 1;
  private workspacePath = process.cwd();
  private aiAdapter = 'Gemini CLI';
  private aiModel = 'gemini-2.5-pro';
  private ownerName = 'Sourav';
  private inkRenderer: InkTerminalRenderer | null = null;
  private headerRendered = false;

  constructor(options: SplitPaneOptions = {}) {
    if (options.sessionId) this.sessionId = options.sessionId;
    if (options.isOwner !== undefined) this.isOwner = options.isOwner;
    if (options.memberCount !== undefined) this.memberCount = options.memberCount;
    if (options.workspacePath) this.workspacePath = options.workspacePath;
    if (options.aiAdapter) this.aiAdapter = options.aiAdapter;
    if (options.aiModel) this.aiModel = options.aiModel;
    if (options.ownerName) this.ownerName = options.ownerName;

    if (process.stdout.isTTY) {
      this.inkRenderer = new InkTerminalRenderer({
        sessionId: this.sessionId,
        isOwner: this.isOwner,
        ownerName: this.ownerName,
        aiDriverName: this.aiAdapter,
        aiModel: this.aiModel,
        aiMode: 'Code',
      });
    }
  }

  public getInkRenderer(): InkTerminalRenderer | null {
    return this.inkRenderer;
  }

  public setSessionInfo(
    sessionId: string,
    isOwner: boolean,
    memberCount: number,
    workspacePath?: string,
    ownerName?: string
  ): void {
    this.sessionId = sessionId;
    this.isOwner = isOwner;
    this.memberCount = memberCount;
    if (workspacePath) this.workspacePath = workspacePath;
    if (ownerName) this.ownerName = ownerName;

    if (this.inkRenderer) {
      this.inkRenderer.setSessionInfo(
        this.sessionId,
        this.isOwner,
        this.ownerName || (isOwner ? 'Sourav' : 'Host')
      );
    } else {
      this.renderHeader();
    }
  }

  public setAiInfo(adapter: string, model?: string, status?: string): void {
    this.aiAdapter = adapter;
    if (model) this.aiModel = model;
    if (this.inkRenderer) {
      this.inkRenderer.setAiDriverInfo(adapter, model, status || 'Code');
    }
  }

  public get currentFocus(): PaneFocus {
    return 'chat';
  }

  public setFocus(_focus: PaneFocus): void {}
  public toggleFocus(): PaneFocus {
    return 'chat';
  }

  public renderHeader(): void {
    if (this.headerRendered) return;
    this.headerRendered = true;

    if (this.inkRenderer) {
      this.inkRenderer.renderApp();
      return;
    }

    const badge = this.isOwner
      ? chalk.bgHex('#059669').black.bold(' OWNER ')
      : chalk.bgHex('#2563eb').white.bold(' VISITOR ');

    console.log('');
    console.log(chalk.cyan.bold('⚡ COLLAGILITY CLI') + chalk.gray(' v0.1.0-alpha.6'));
    console.log(chalk.gray('─────────────────────────────────────────────────────────────'));
    console.log(
      `  ${chalk.bold('Session:')}   ${chalk.yellow.bold(this.sessionId || 'active')} ${badge} ${chalk.gray(`(${this.memberCount} active)`)}`
    );
    console.log(`  ${chalk.bold('Workspace:')} ${chalk.blue(this.workspacePath)}`);
    console.log(`  ${chalk.bold('AI Engine:')} ${chalk.magenta.bold(this.aiAdapter)} ${chalk.gray('(Stream Relay Active)')}`);
    console.log(chalk.gray('─────────────────────────────────────────────────────────────\n'));
  }

  public appendChat(line: string): void {
    if (this.inkRenderer) {
      this.inkRenderer.appendMessage({
        content: line,
        sender: 'System',
        senderRole: 'system',
      });
    } else {
      if (!this.headerRendered) this.renderHeader();
      console.log(line);
    }
  }

  public appendPtyData(data: string): void {
    if (this.inkRenderer) {
      this.inkRenderer.appendMessage({
        content: data,
        sender: 'Gemini',
        senderRole: 'ai',
      });
    } else {
      if (!this.headerRendered) this.renderHeader();
      process.stdout.write(data);
    }
  }

  public setInput(_input: string): void {}
  public clearPty(): void {}
  public render(): void {
    if (this.inkRenderer) {
      this.inkRenderer.renderApp();
    }
  }
}

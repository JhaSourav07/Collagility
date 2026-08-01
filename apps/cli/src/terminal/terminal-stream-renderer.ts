import chalk from 'chalk';
import readline from 'node:readline';
import { colors } from './colors.js';
import type { StreamChunk } from '@collagility/stream';

export interface TerminalStreamRendererOptions {
  stdout?: { write: (str: string) => boolean };
}

export class TerminalStreamRenderer {
  private stdout: { write: (str: string) => boolean };
  private isStreaming = false;
  private inCodeBlock = false;
  private currentLanguage = '';
  private totalContentLength = 0;
  private activeAdapterName = 'default';

  // Thinking state
  private thinkingSteps: string[] = [];
  private isThinkingCollapsed = true;
  private inThinkingBlock = false;

  constructor(options: TerminalStreamRendererOptions = {}) {
    this.stdout = options.stdout || process.stdout;
  }

  private getStyle(adapterName: string) {
    const key = adapterName.toLowerCase();
    const styles = colors.aiStyles as Record<string, any>;
    return styles[key] || styles.default;
  }

  public toggleThinkingCollapse(): boolean {
    this.isThinkingCollapsed = !this.isThinkingCollapsed;

    if (this.thinkingSteps.length > 0) {
      this.stdout.write('\n');
      if (this.isThinkingCollapsed) {
        this.stdout.write(chalk.gray(`● Thinking summary (${this.thinkingSteps.length} steps collapsed, press ctrl+o to expand)\n`));
      } else {
        this.stdout.write(chalk.gray(`● Thinking details (${this.thinkingSteps.length} steps):\n`));
        this.thinkingSteps.forEach((step, idx) => {
          this.stdout.write(chalk.gray(`  └ ${idx + 1}. ${step}\n`));
        });
      }
      this.stdout.write('\n');
    }

    return this.isThinkingCollapsed;
  }

  public onStreamStarted(streamId: string, adapterName: string, prompt: string): void {
    this.isStreaming = true;
    this.inCodeBlock = false;
    this.currentLanguage = '';
    this.totalContentLength = 0;
    this.activeAdapterName = adapterName;
    this.thinkingSteps = [];
    this.inThinkingBlock = false;

    const style = this.getStyle(adapterName);
    const time = new Date().toLocaleTimeString();
    const header = [
      '',
      colors.dim(`[${time}] `) + style.badge + ' ' + style.title(`AI Stream Started (${adapterName})`),
      colors.dim(`Prompt: "${prompt}"`),
      style.border('─'.repeat(60)),
      '',
    ].join('\n');

    this.stdout.write(header);
  }

  private formatRichText(text: string): string {
    return text
      .replace(/`([^`]+)`/g, (_m, code) => chalk.bgHex('#334155').white(` ${code} `))
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, linkText) => chalk.cyan.underline(linkText));
  }

  private formatLine(line: string): string {
    const trimmed = line.trim();
    if (!trimmed) return '\n';

    // Rule 1: Tool Call (e.g. "● ListDir(/run/media/sourav/...)")
    const toolMatch = trimmed.match(/^(?:●|\*|->)?\s*([A-Z][A-Za-z0-9_]+)\((.*?)\)/);
    if (toolMatch) {
      this.endThinkingBlock();
      const toolName = toolMatch[1];
      const toolArgs = toolMatch[2];
      return `${chalk.green('●')} ${chalk.yellow.bold(toolName)}${chalk.gray(`(${toolArgs})`)}\n`;
    }

    // Rule 2: Tool Sub-result / Branch Line (e.g. "⎿ 19 files, 7 directories...")
    const branchMatch = trimmed.match(/^(?:⎿|└|\|-)\s*(.*)/);
    if (branchMatch) {
      this.endThinkingBlock();
      return `${chalk.gray('└')} ${chalk.gray(branchMatch[1])}\n`;
    }

    // Rule 3: Thinking Line (e.g. "I am listing...", "Let's inspect...", "I'll also inspect...")
    const isThinking = /^(thinking|working|analyzing|making|creating|reading|editing|refactoring|checking|listing|overwriting|viewing|inspecting|i am|i will|i have|i'll|i'm|let's|let us|first|next|now)/i.test(trimmed);
    if (isThinking) {
      this.thinkingSteps.push(trimmed);
      this.inThinkingBlock = true;

      if (this.isThinkingCollapsed) {
        if (process.stdout.isTTY) {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
        }
        this.stdout.write(chalk.gray(`● Thinking... `) + chalk.dim(`(${this.thinkingSteps.length} steps, ctrl+o to expand)`));
        return '';
      } else {
        return `${chalk.gray(`  └ ${this.formatRichText(trimmed)}`)}\n`;
      }
    }

    // Rule 4: Standard body text with inline code badges & links
    this.endThinkingBlock();
    return this.formatRichText(line);
  }

  private endThinkingBlock(): void {
    if (this.inThinkingBlock) {
      if (this.isThinkingCollapsed && this.thinkingSteps.length > 0) {
        this.stdout.write('\n');
      }
      this.inThinkingBlock = false;
    }
  }

  public renderChunk(chunk: StreamChunk): void {
    if (!this.isStreaming) {
      return;
    }

    const content = chunk.content;
    if (!content || !content.trim()) return;  // Skip empty/filtered chunks (e.g. stripped agy banners)
    this.totalContentLength += content.length;
    const style = this.getStyle(this.activeAdapterName);

    const lines = content.split(/(\r?\n)/);
    for (const segment of lines) {
      if (!segment) continue;

      const match = segment.match(/^```(\w*)/);
      if (match) {
        this.endThinkingBlock();
        if (!this.inCodeBlock) {
          this.inCodeBlock = true;
          this.currentLanguage = match[1] || 'code';
          this.stdout.write(style.border(`\n┌── [${this.currentLanguage}] ─────────────────────────\n`));
        } else {
          this.inCodeBlock = false;
          this.stdout.write(style.border(`\n└──────────────────────────────────────────────\n`));
          this.currentLanguage = '';
        }
      } else {
        if (this.inCodeBlock && segment !== '\n' && segment !== '\r\n') {
          this.stdout.write(colors.code(segment));
        } else {
          // Pre-split concatenated sentence boundaries
          const subSegments = segment
            .replace(/(\.|\?|\!)\s*(I |I'll |I'm |I will |I am |I have |Let's |Let us |First|Next|Now|● )/g, '$1\n\n$2')
            .split('\n');

          for (const sub of subSegments) {
            const formatted = this.formatLine(sub);
            if (formatted) {
              this.stdout.write(formatted);
            }
          }
        }
      }
    }
  }

  public onStreamCompleted(summary: { totalChunks: number; durationMs: number }): void {
    if (!this.isStreaming) return;
    this.endThinkingBlock();
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const footer = [
      '',
      style.border('─'.repeat(60)),
      colors.success(`[DONE] Stream Complete (${summary.totalChunks} chunks, ${summary.durationMs}ms, ${this.totalContentLength} bytes)`),
      '',
    ].join('\n');

    this.stdout.write(footer);
  }

  public onStreamCancelled(reason?: string): void {
    if (!this.isStreaming) return;
    this.endThinkingBlock();
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const msg = [
      '',
      style.border('─'.repeat(60)),
      colors.warning(`[CANCELLED] Stream Cancelled (${reason || 'No reason provided'})`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }

  public onStreamFailed(error: string): void {
    if (!this.isStreaming) return;
    this.endThinkingBlock();
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const msg = [
      '',
      style.border('─'.repeat(60)),
      colors.error(`[ERROR] Stream Failed: ${error}`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }
}

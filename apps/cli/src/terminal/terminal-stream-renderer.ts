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

  constructor(options: TerminalStreamRendererOptions = {}) {
    this.stdout = options.stdout || process.stdout;
  }

  private getStyle(adapterName: string) {
    const key = adapterName.toLowerCase();
    const styles = colors.aiStyles as Record<string, any>;
    return styles[key] || styles.default;
  }

  public onStreamStarted(streamId: string, adapterName: string, prompt: string): void {
    this.isStreaming = true;
    this.inCodeBlock = false;
    this.currentLanguage = '';
    this.totalContentLength = 0;
    this.activeAdapterName = adapterName;

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

  public renderChunk(chunk: StreamChunk): void {
    if (!this.isStreaming) {
      return;
    }

    const content = chunk.content;
    this.totalContentLength += content.length;
    const style = this.getStyle(this.activeAdapterName);

    // Detect markdown code fence boundaries for visual highlighting
    const lines = content.split(/(\r?\n)/);
    for (const segment of lines) {
      const match = segment.match(/^```(\w*)/);
      if (match) {
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
          // Detect thinking/progress lines (e.g. "Thinking...", "Working...", "Analyzing...", "I will...")
          const trimmed = segment.trim();
          const isThinkingLine =
            trimmed.length > 0 &&
            (/^(thinking|working|analyzing|making|creating|reading|editing|refactoring|checking|listing|overwriting|viewing|inspecting|i am|i will|⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏)/i.test(trimmed));

          if (isThinkingLine) {
            this.stdout.write(style.thinking(`⚡ ${segment}`));
          } else {
            this.stdout.write(segment);
          }
        }
      }
    }
  }

  public onStreamCompleted(summary: { totalChunks: number; durationMs: number }): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const footer = [
      '',
      style.border('─'.repeat(60)),
      colors.success(`✓ Stream Complete (${summary.totalChunks} chunks, ${summary.durationMs}ms, ${this.totalContentLength} bytes)`),
      '',
    ].join('\n');

    this.stdout.write(footer);
  }

  public onStreamCancelled(reason?: string): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const msg = [
      '',
      style.border('─'.repeat(60)),
      colors.warning(`🛑 Stream Cancelled (${reason || 'No reason provided'})`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }

  public onStreamFailed(error: string): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const style = this.getStyle(this.activeAdapterName);
    const msg = [
      '',
      style.border('─'.repeat(60)),
      colors.error(`✖ Stream Failed: ${error}`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }
}

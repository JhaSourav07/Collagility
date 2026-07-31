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

  constructor(options: TerminalStreamRendererOptions = {}) {
    this.stdout = options.stdout || process.stdout;
  }

  public onStreamStarted(streamId: string, adapterName: string, prompt: string): void {
    this.isStreaming = true;
    this.inCodeBlock = false;
    this.currentLanguage = '';
    this.totalContentLength = 0;

    const time = new Date().toLocaleTimeString();
    const header = [
      '',
      colors.dim(`[${time}] `) + colors.accent(colors.bold(`🤖 AI Stream Started (${adapterName})`)),
      colors.dim(`Prompt: "${prompt}"`),
      colors.dim('─'.repeat(60)),
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

    // Detect markdown code fence boundaries for visual highlighting
    const lines = content.split(/(\r?\n)/);
    for (const segment of lines) {
      const match = segment.match(/^```(\w*)/);
      if (match) {
        if (!this.inCodeBlock) {
          this.inCodeBlock = true;
          this.currentLanguage = match[1] || 'code';
          this.stdout.write(colors.cyan(`\n┌── [${this.currentLanguage}] ─────────────────────────\n`));
        } else {
          this.inCodeBlock = false;
          this.stdout.write(colors.cyan(`\n└──────────────────────────────────────────────\n`));
          this.currentLanguage = '';
        }
      } else {
        if (this.inCodeBlock && segment !== '\n' && segment !== '\r\n') {
          this.stdout.write(colors.bold(segment));
        } else {
          this.stdout.write(segment);
        }
      }
    }
  }

  public onStreamCompleted(summary: { totalChunks: number; durationMs: number }): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const footer = [
      '',
      colors.dim('─'.repeat(60)),
      colors.success(`✓ Stream Complete (${summary.totalChunks} chunks, ${summary.durationMs}ms, ${this.totalContentLength} bytes)`),
      '',
    ].join('\n');

    this.stdout.write(footer);
  }

  public onStreamCancelled(reason?: string): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const msg = [
      '',
      colors.dim('─'.repeat(60)),
      colors.warning(`🛑 Stream Cancelled (${reason || 'No reason provided'})`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }

  public onStreamFailed(error: string): void {
    if (!this.isStreaming) return;
    this.isStreaming = false;

    const msg = [
      '',
      colors.dim('─'.repeat(60)),
      colors.error(`✖ Stream Failed: ${error}`),
      '',
    ].join('\n');

    this.stdout.write(msg);
  }
}

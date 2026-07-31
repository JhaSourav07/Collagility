import type { Writable } from 'node:stream';
import { AdapterTimeoutError, AdapterCancellationError } from '../base/errors.js';

export interface PendingPrompt {
  prompt: string;
  resolve: (response: string) => void;
  reject: (reason?: unknown) => void;
  timeoutTimer: NodeJS.Timeout | null;
  accumulatedOutput: string[];
}

export class GeminiPromptHandler {
  private activePrompt: PendingPrompt | null = null;
  private adapterName: string;

  constructor(adapterName: string = 'gemini') {
    this.adapterName = adapterName;
  }

  public hasActivePrompt(): boolean {
    return this.activePrompt !== null;
  }

  public sendPromptToStream(
    stdinStream: Writable | null,
    prompt: string,
    timeoutMs: number = 30000
  ): Promise<string> {
    if (this.activePrompt) {
      return Promise.reject(new Error('Another prompt is currently being processed by Gemini adapter'));
    }

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.activePrompt) {
          const current = this.activePrompt;
          this.activePrompt = null;
          current.reject(new AdapterTimeoutError(this.adapterName, timeoutMs));
        }
      }, timeoutMs);

      this.activePrompt = {
        prompt,
        resolve,
        reject,
        timeoutTimer: timer,
        accumulatedOutput: [],
      };

      if (stdinStream && stdinStream.writable) {
        stdinStream.write(`${prompt}\n`);
      } else {
        // Mock / non-stdin mode fallback accumulator
      }
    });
  }

  public appendOutputChunk(content: string): void {
    if (this.activePrompt) {
      this.activePrompt.accumulatedOutput.push(content);
    }
  }

  public completeActivePrompt(finalResponse?: string): void {
    if (this.activePrompt) {
      const current = this.activePrompt;
      this.activePrompt = null;
      if (current.timeoutTimer) clearTimeout(current.timeoutTimer);

      const response = finalResponse ?? current.accumulatedOutput.join('\n').trim();
      current.resolve(response);
    }
  }

  public cancelActivePrompt(reason: string = 'Prompt cancelled'): void {
    if (this.activePrompt) {
      const current = this.activePrompt;
      this.activePrompt = null;
      if (current.timeoutTimer) clearTimeout(current.timeoutTimer);

      current.reject(new AdapterCancellationError(this.adapterName, reason));
    }
  }

  public failActivePrompt(error: Error): void {
    if (this.activePrompt) {
      const current = this.activePrompt;
      this.activePrompt = null;
      if (current.timeoutTimer) clearTimeout(current.timeoutTimer);

      current.reject(error);
    }
  }
}

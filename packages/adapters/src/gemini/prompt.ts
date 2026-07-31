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
    timeoutMs: number = 0
  ): Promise<string> {
    if (this.activePrompt) {
      return Promise.reject(new Error('Another prompt is currently being processed by Gemini adapter'));
    }

    return new Promise<string>((resolve, reject) => {
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              if (this.activePrompt) {
                const current = this.activePrompt;
                this.activePrompt = null;
                current.reject(new AdapterTimeoutError(this.adapterName, timeoutMs));
              }
            }, timeoutMs)
          : null;

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

  public completeActivePrompt(): void {
    if (this.activePrompt) {
      if (this.activePrompt.timeoutTimer) {
        clearTimeout(this.activePrompt.timeoutTimer);
      }
      const fullResponse = this.activePrompt.accumulatedOutput.join('');
      const resolve = this.activePrompt.resolve;
      this.activePrompt = null;
      resolve(fullResponse);
    }
  }

  public cancelActivePrompt(reason = 'Prompt processing cancelled'): void {
    if (this.activePrompt) {
      if (this.activePrompt.timeoutTimer) {
        clearTimeout(this.activePrompt.timeoutTimer);
      }
      const reject = this.activePrompt.reject;
      this.activePrompt = null;
      reject(new AdapterCancellationError(this.adapterName, reason));
    }
  }
}

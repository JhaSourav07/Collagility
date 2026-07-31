import { AIAdapter, type AdapterHealth, type AdapterStatus } from '../base/adapter.js';
import {
  createAIStartedEvent,
  createAIReadyEvent,
  createAIPromptEvent,
  createAICompletedEvent,
  createAIFailedEvent,
  createAICancelledEvent,
  type EventEnvelope,
  type AICompletedPayload,
} from '@collagility/protocol';
import { AdapterExecutionError } from '../base/errors.js';

import { GeminiHealthChecker, type GeminiHealthInfo } from './health.js';
import { GeminiLifecycleManager } from './lifecycle.js';
import { GeminiOutputParser } from './parser.js';
import { GeminiStdoutHandler } from './stdout.js';
import { GeminiStderrHandler } from './stderr.js';
import { GeminiPromptHandler } from './prompt.js';
import { GeminiProcessManager, type ProcessOptions } from './gemini-process.js';
export type { GeminiHealthInfo };

export interface GeminiAdapterConfig {
  binaryPath?: string;
  args?: string[];
  cwd?: string;
  mockMode?: boolean;
  mockProcessFactory?: ProcessOptions['mockProcessFactory'];
  timeoutMs?: number;
}

export class GeminiAIAdapter extends AIAdapter {
  public readonly id = 'gemini';
  public readonly name = 'gemini';
  public readonly version = '1.0.0';

  private healthChecker: GeminiHealthChecker;
  private lifecycleManager: GeminiLifecycleManager;
  private stdoutHandler: GeminiStdoutHandler;
  private stderrHandler: GeminiStderrHandler;
  private promptHandler: GeminiPromptHandler;
  private processManager: GeminiProcessManager | null = null;
  private adapterConfig: GeminiAdapterConfig;

  constructor(config: GeminiAdapterConfig = {}) {
    super();
    this.adapterConfig = config;
    const isMock = Boolean(config.mockMode || config.mockProcessFactory);
    this.healthChecker = new GeminiHealthChecker(config.binaryPath ?? 'gemini', isMock);
    this.lifecycleManager = new GeminiLifecycleManager();

    const parser = new GeminiOutputParser();
    this.stdoutHandler = new GeminiStdoutHandler(parser);
    this.stderrHandler = new GeminiStderrHandler();
    this.promptHandler = new GeminiPromptHandler('gemini');
  }

  public get status(): AdapterStatus {
    return this.lifecycleManager.status;
  }

  public get config(): Record<string, unknown> {
    return { ...this._config };
  }

  public async checkDetailedHealth(): Promise<GeminiHealthInfo> {
    return this.healthChecker.checkDetailedHealth();
  }

  public async initialize(config: Record<string, unknown> = {}): Promise<void> {
    this.lifecycleManager.setStatus('initializing');
    this._config = { ...this.adapterConfig, ...config };

    const isMock = Boolean(this._config['mockMode'] || this.adapterConfig.mockProcessFactory);
    this.healthChecker = new GeminiHealthChecker(this.adapterConfig.binaryPath ?? 'gemini', isMock);

    this.emit('ai.started', createAIStartedEvent(this.name));

    this.stdoutHandler.onChunk((parsed) => {
      if (parsed.type === 'completion') {
        this.promptHandler.completeActivePrompt();
      } else {
        this.promptHandler.appendOutputChunk(parsed.content);
        this.emit('chunk' as any, parsed.content);
      }
    });

    this.stderrHandler.onErrorLine((errLine) => {
      if (errLine.trim().length > 0) {
        this.emit('chunk' as any, `${errLine}\n`);
      }
    });

    // Always instantiate process manager for real execution or mock factory
    this.processManager = new GeminiProcessManager(
      {
        binaryPath: this.adapterConfig.binaryPath ?? 'gemini',
        args: this.adapterConfig.args,
        cwd: this.adapterConfig.cwd,
        mockProcessFactory: this.adapterConfig.mockProcessFactory,
      },
      this.stdoutHandler,
      this.stderrHandler,
      this.lifecycleManager
    );

    this.processManager.onExit((code, _signal) => {
      this.promptHandler.completeActivePrompt();
      if (this.lifecycleManager.status === 'processing') {
        if (code !== 0 && code !== null) {
          const failEvt = createAIFailedEvent(this.name, `Process exited with code ${code}`);
          this.emit('ai.failed', failEvt);
        } else {
          this.lifecycleManager.setStatus('ready');
        }
      }
    });

    this.lifecycleManager.setStatus('ready');
    this.emit('ai.ready', createAIReadyEvent(this.name));
  }

  public async start(): Promise<void> {
    if (this.status === 'uninitialized') {
      await this.initialize();
    }
    this.lifecycleManager.setStatus('ready');
  }

  public async stop(): Promise<void> {
    await this.cancel();
    if (this.processManager) {
      this.processManager.killProcess('SIGTERM');
    }
    this.lifecycleManager.setStatus('stopped');
  }

  public async sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>> {
    if (this.status !== 'ready') {
      throw new AdapterExecutionError(this.name, `Gemini adapter is not in ready status (current: ${this.status})`);
    }

    this.lifecycleManager.setStatus('processing');
    this.emit('ai.prompt', createAIPromptEvent(prompt, context));

    if (this.processManager && !this.adapterConfig.mockMode) {
      this.processManager.spawnProcessForPrompt(prompt);
      const stdinStream = this.processManager.getStdin();
      const timeoutMs = this.adapterConfig.timeoutMs ?? 0;

      try {
        const responseText = await this.promptHandler.sendPromptToStream(stdinStream, prompt, timeoutMs);
        this.lifecycleManager.setStatus('ready');
        const evt = createAICompletedEvent(this.name, responseText, { provider: 'google-gemini' });
        this.emit('ai.completed', evt);
        return evt;
      } catch (err) {
        if ((this.status as string) !== 'cancelled') {
          this.lifecycleManager.setStatus('failed');
          const rawErr = err instanceof Error ? err.message : String(err);
          const bufferedStderr = this.stderrHandler.getBufferedStderr().trim();
          const errorMsg = bufferedStderr ? `${rawErr} (${bufferedStderr})` : rawErr;
          this.emit('ai.failed', createAIFailedEvent(this.name, errorMsg));
        }
        throw err;
      }
    } else {
      const responseText = `[AI Response]: Processed prompt "${prompt}"`;
      this.lifecycleManager.setStatus('ready');
      const evt = createAICompletedEvent(this.name, responseText, { provider: 'google-gemini' });
      this.emit('ai.completed', evt);
      return evt;
    }
  }

  public async cancel(): Promise<void> {
    if (this.status === 'processing') {
      this.lifecycleManager.setStatus('cancelled');
      this.promptHandler.cancelActivePrompt('Cancellation requested');
      if (this.processManager) {
        this.processManager.killProcess('SIGINT');
      }
      this.emit('ai.cancelled', createAICancelledEvent(this.name, 'Cancellation requested'));
    }
  }

  public async health(): Promise<AdapterHealth> {
    return this.healthChecker.checkHealth(this.status);
  }

  public async dispose(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    this.lifecycleManager.setStatus('uninitialized');
  }
}

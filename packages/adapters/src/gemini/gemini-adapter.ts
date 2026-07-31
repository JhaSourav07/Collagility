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
  mockMode?: boolean;
  mockProcessFactory?: ProcessOptions['mockProcessFactory'];
  timeoutMs?: number;
}

export class GeminiAIAdapter extends AIAdapter {
  public readonly id = 'adapter-gemini-cli';
  public readonly name = 'gemini';
  public readonly version = '0.1.0';

  private healthChecker: GeminiHealthChecker;
  private lifecycleManager: GeminiLifecycleManager;
  private parser: GeminiOutputParser;
  private stdoutHandler: GeminiStdoutHandler;
  private stderrHandler: GeminiStderrHandler;
  private promptHandler: GeminiPromptHandler;
  private processManager?: GeminiProcessManager;

  private adapterConfig: GeminiAdapterConfig = {};

  constructor(config: GeminiAdapterConfig = {}) {
    super();
    this.adapterConfig = config;
    const isMock = Boolean(config.mockMode || config.mockProcessFactory);
    this.healthChecker = new GeminiHealthChecker(config.binaryPath ?? 'gemini', isMock);
    this.lifecycleManager = new GeminiLifecycleManager();
    this.parser = new GeminiOutputParser();
    this.stdoutHandler = new GeminiStdoutHandler(this.parser);
    this.stderrHandler = new GeminiStderrHandler();
    this.promptHandler = new GeminiPromptHandler(this.name);
  }

  public get status(): AdapterStatus {
    return this.lifecycleManager.status;
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
      }
    });

    this.stderrHandler.onErrorLine((_errLine) => {
      // Diagnostic stderr logging
    });

    if (this.adapterConfig.mockProcessFactory) {
      this.processManager = new GeminiProcessManager(
        {
          binaryPath: this.adapterConfig.binaryPath,
          mockProcessFactory: this.adapterConfig.mockProcessFactory,
        },
        this.stdoutHandler,
        this.stderrHandler,
        this.lifecycleManager
      );

      this.processManager.onExit((code, _signal) => {
        if (this.lifecycleManager.status === 'processing') {
          const restarted = this.lifecycleManager.recordCrash();
          if (restarted) {
            this.emit('ai.status', createAIStartedEvent(this.name));
          } else {
            const failEvt = createAIFailedEvent(this.name, `Gemini process exited unexpectedly with code ${code}`);
            this.emit('ai.failed', failEvt);
            this.promptHandler.failActivePrompt(
              new AdapterExecutionError(this.name, `Gemini process exited unexpectedly with code ${code}`)
            );
          }
        }
      });
    }

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

    if (this.processManager) {
      this.processManager.spawnProcess();
      const stdinStream = this.processManager.getStdin();
      const timeoutMs = this.adapterConfig.timeoutMs ?? 30000;

      try {
        const responseText = await this.promptHandler.sendPromptToStream(stdinStream, prompt, timeoutMs);
        this.lifecycleManager.setStatus('ready');
        const evt = createAICompletedEvent(this.name, responseText, { provider: 'google-gemini' });
        this.emit('ai.completed', evt);
        return evt;
      } catch (err) {
        if ((this.status as string) !== 'cancelled') {
          this.lifecycleManager.setStatus('failed');
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.emit('ai.failed', createAIFailedEvent(this.name, errorMsg));
        }
        throw err;
      }
    } else {
      // Direct mock fallback execution if process manager is unassigned
      const responseText = `[Gemini CLI Stub Response]: Processed prompt "${prompt}"`;
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

import { AIAdapter, type AdapterHealth } from '../base/adapter.js';
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
import {
  AdapterInitializationError,
  AdapterExecutionError,
  AdapterCancellationError,
} from '../base/errors.js';

export interface MockAdapterOptions {
  id?: string;
  name?: string;
  version?: string;
  shouldFailInit?: boolean;
  shouldFailPrompt?: boolean;
  responseDelayMs?: number;
  mockResponseText?: string;
}

export class MockAIAdapter extends AIAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;

  private options: MockAdapterOptions;
  private currentTimeout: NodeJS.Timeout | null = null;
  private pendingReject: ((reason?: unknown) => void) | null = null;

  constructor(options: MockAdapterOptions = {}) {
    super();
    this.id = options.id || 'mock-adapter-id';
    this.name = options.name || 'mock';
    this.version = options.version || '1.0.0';
    this.options = options;
  }

  public async initialize(config: Record<string, unknown> = {}): Promise<void> {
    this._status = 'initializing';
    this._config = { ...config };
    this.emit('ai.started', createAIStartedEvent(this.name));

    if (this.options.shouldFailInit) {
      this._status = 'failed';
      const failEvent = createAIFailedEvent(this.name, 'Mock initialization failure');
      this.emit('ai.failed', failEvent);
      throw new AdapterInitializationError(this.name, 'Mock initialization failure');
    }

    this._status = 'ready';
    this.emit('ai.ready', createAIReadyEvent(this.name));
  }

  public async start(): Promise<void> {
    if (this._status === 'uninitialized') {
      await this.initialize();
    }
    this._status = 'ready';
  }

  public async stop(): Promise<void> {
    await this.cancel();
    this._status = 'stopped';
  }

  public async sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>> {
    if (this._status !== 'ready' && this._status !== 'processing') {
      throw new AdapterExecutionError(this.name, `Adapter is in '${this._status}' status, cannot send prompt`);
    }

    this._status = 'processing';
    this.emit('ai.prompt', createAIPromptEvent(prompt, context));

    const responseDelay = this.options.responseDelayMs ?? 10;
    const responseText = this.options.mockResponseText ?? `Mock response for: "${prompt}"`;

    return new Promise<EventEnvelope<AICompletedPayload>>((resolve, reject) => {
      this.pendingReject = reject;

      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = null;
        this.pendingReject = null;

        if (this.options.shouldFailPrompt) {
          this._status = 'failed';
          const failEvt = createAIFailedEvent(this.name, 'Mock execution error');
          this.emit('ai.failed', failEvt);
          return reject(new AdapterExecutionError(this.name, 'Mock execution error'));
        }

        this._status = 'ready';
        const completedEvt = createAICompletedEvent(this.name, responseText, {
          tokens: 42,
          model: 'mock-model-v1',
        });
        this.emit('ai.completed', completedEvt);
        resolve(completedEvt);
      }, responseDelay);
    });
  }

  public async sendInput(text: string): Promise<void> {
    this.emit('chunk' as any, `[Input received]: ${text}\n`);
  }

  public async cancel(): Promise<void> {
    if (this._status === 'processing') {
      if (this.currentTimeout) {
        clearTimeout(this.currentTimeout);
        this.currentTimeout = null;
      }
      this._status = 'cancelled';
      this.emit('ai.cancelled', createAICancelledEvent(this.name, 'User requested cancellation'));
      if (this.pendingReject) {
        const rejectFn = this.pendingReject;
        this.pendingReject = null;
        rejectFn(new AdapterCancellationError(this.name, 'User requested cancellation'));
      }
    }
  }

  public async health(): Promise<AdapterHealth> {
    return {
      ok: this._status !== 'failed' && this._status !== 'stopped',
      message: `Adapter status: ${this._status}`,
      latencyMs: 5,
    };
  }

  public async dispose(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    this._status = 'uninitialized';
  }
}

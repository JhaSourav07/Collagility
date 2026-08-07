import { AIAdapter, type AdapterHealth } from '../base/adapter.js';
import {
  createAIStartedEvent,
  createAIReadyEvent,
  createAIPromptEvent,
  createAICompletedEvent,
  createAICancelledEvent,
  type EventEnvelope,
  type AICompletedPayload,
} from '@collagility/protocol';
import { AdapterExecutionError } from '../base/errors.js';

export class AiderAIAdapter extends AIAdapter {
  public readonly id = 'adapter-aider-cli';
  public readonly name = 'aider';
  public readonly version = '0.1.0';

  public async initialize(config: Record<string, unknown> = {}): Promise<void> {
    this._status = 'initializing';
    this._config = { ...config };
    this.emit('ai.started', createAIStartedEvent(this.name));

    this._status = 'ready';
    this.emit('ai.ready', createAIReadyEvent(this.name));
  }

  public async start(): Promise<void> {
    if (this._status === 'uninitialized') {
      await this.initialize();
    }
  }

  public async stop(): Promise<void> {
    await this.cancel();
    this._status = 'stopped';
  }

  public async sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>> {
    if (this._status !== 'ready') {
      throw new AdapterExecutionError(this.name, `Adapter is not in ready status (current: ${this._status})`);
    }

    this._status = 'processing';
    this.emit('ai.prompt', createAIPromptEvent(prompt, context));

    const responseText = `[Aider Adapter Stub Response]: Processed prompt "${prompt}"`;
    this._status = 'ready';

    const evt = createAICompletedEvent(this.name, responseText, { provider: 'aider-chat' });
    this.emit('ai.completed', evt);
    return evt;
  }

  public async sendInput(text: string): Promise<void> {
    this.emit('chunk', `[Aider Input]: ${text}\n`);
  }

  public async cancel(): Promise<void> {
    if (this._status === 'processing') {
      this._status = 'cancelled';
      this.emit('ai.cancelled', createAICancelledEvent(this.name, 'Cancellation requested'));
    }
  }

  public async health(): Promise<AdapterHealth> {
    return {
      ok: this._status === 'ready',
      message: `Aider adapter status: ${this._status}`,
    };
  }

  public async dispose(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    this._status = 'uninitialized';
  }
}

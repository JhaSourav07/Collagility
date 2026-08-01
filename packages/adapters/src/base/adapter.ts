import { EventEmitter } from 'node:events';
import type {
  EventEnvelope,
  AICompletedPayload,
} from '@collagility/protocol';
import type { AdapterEventMap, AdapterEventName, AdapterEventListener } from './events.js';

export type AdapterStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'processing'
  | 'cancelled'
  | 'failed'
  | 'stopped';

export interface AdapterHealth {
  ok: boolean;
  message?: string;
  latencyMs?: number;
}

export abstract class AIAdapter extends EventEmitter {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly version: string;

  protected _status: AdapterStatus = 'uninitialized';
  protected _config: Record<string, unknown> = {};

  public get status(): AdapterStatus {
    return this._status;
  }

  public get config(): Readonly<Record<string, unknown>> {
    return this._config;
  }

  // Strongly typed EventEmitter wrappers
  public on<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  public once<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  public off<K extends AdapterEventName>(event: K, listener: AdapterEventListener<K>): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  public emit<K extends AdapterEventName>(event: K, envelope: AdapterEventMap[K]): boolean {
    return super.emit(event, envelope);
  }

  // Abstract lifecycle and execution interface
  public abstract initialize(config?: Record<string, unknown>): Promise<void>;
  public abstract start(): Promise<void>;
  public abstract stop(): Promise<void>;
  public abstract sendPrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<EventEnvelope<AICompletedPayload>>;
  public abstract sendInput(text: string): Promise<void>;
  public abstract cancel(): Promise<void>;
  public abstract health(): Promise<AdapterHealth>;
  public abstract dispose(): Promise<void>;
}

import type { AdapterStatus } from '../base/adapter.js';

export interface LifecycleOptions {
  maxAutoRestarts?: number;
}

export class GeminiLifecycleManager {
  private _status: AdapterStatus = 'uninitialized';
  private restartCount = 0;
  private maxAutoRestarts: number;

  constructor(options: LifecycleOptions = {}) {
    this.maxAutoRestarts = options.maxAutoRestarts ?? 3;
  }

  public get status(): AdapterStatus {
    return this._status;
  }

  public get autoRestartCount(): number {
    return this.restartCount;
  }

  public setStatus(status: AdapterStatus): void {
    this._status = status;
  }

  public recordCrash(): boolean {
    this.restartCount += 1;
    if (this.restartCount <= this.maxAutoRestarts) {
      this._status = 'initializing';
      return true; // Can auto-restart
    }
    this._status = 'failed';
    return false; // Reached max restart limit
  }

  public resetRestartCounter(): void {
    this.restartCount = 0;
  }
}

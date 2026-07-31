import { EventEmitter } from 'node:events';

export interface CancellationReason {
  requestedBy: string;
  reason?: string;
  timestamp: number;
}

export class CancellationManager extends EventEmitter {
  private activeAbortControllers: Map<string, AbortController> = new Map();
  private cancellationReasons: Map<string, CancellationReason> = new Map();

  public createToken(streamId: string): AbortSignal {
    const controller = new AbortController();
    this.activeAbortControllers.set(streamId, controller);
    return controller.signal;
  }

  public cancel(streamId: string, requestedBy: string, reason = 'User requested cancellation'): boolean {
    const controller = this.activeAbortControllers.get(streamId);
    const cancellationInfo: CancellationReason = {
      requestedBy,
      reason,
      timestamp: Date.now(),
    };

    this.cancellationReasons.set(streamId, cancellationInfo);

    if (controller) {
      controller.abort(reason);
      this.activeAbortControllers.delete(streamId);
    }

    this.emit('cancelled', { streamId, ...cancellationInfo });
    return true;
  }

  public isCancelled(streamId: string): boolean {
    const controller = this.activeAbortControllers.get(streamId);
    return controller ? controller.signal.aborted : this.cancellationReasons.has(streamId);
  }

  public getCancellationReason(streamId: string): CancellationReason | undefined {
    return this.cancellationReasons.get(streamId);
  }

  public cleanup(streamId: string): void {
    this.activeAbortControllers.delete(streamId);
    this.cancellationReasons.delete(streamId);
  }
}

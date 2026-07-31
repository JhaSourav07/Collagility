import { describe, it, expect } from 'vitest';
import { CancellationManager } from './cancellation.js';

describe('CancellationManager', () => {
  it('should create abort signals and handle cancel requests', () => {
    const manager = new CancellationManager();
    const signal = manager.createToken('stream-1');

    expect(signal.aborted).toBe(false);
    expect(manager.isCancelled('stream-1')).toBe(false);

    const cancelled = manager.cancel('stream-1', 'user-123', 'Owner requested stop');
    expect(cancelled).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(manager.isCancelled('stream-1')).toBe(true);

    const reason = manager.getCancellationReason('stream-1');
    expect(reason?.requestedBy).toBe('user-123');
    expect(reason?.reason).toBe('Owner requested stop');
  });

  it('should clean up tokens and reasons', () => {
    const manager = new CancellationManager();
    manager.createToken('stream-1');
    manager.cancel('stream-1', 'user-123');
    manager.cleanup('stream-1');

    expect(manager.isCancelled('stream-1')).toBe(false);
    expect(manager.getCancellationReason('stream-1')).toBeUndefined();
  });
});

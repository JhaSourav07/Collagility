import { describe, it, expect } from 'vitest';
import { ReconnectHandler } from './reconnect.js';

describe('ReconnectHandler', () => {
  it('should allow reconnection up to maxAttempts', () => {
    const handler = new ReconnectHandler(3, 100);

    expect(handler.shouldReconnect()).toBe(true);
    handler.getNextDelay(); // Attempt 1
    expect(handler.shouldReconnect()).toBe(true);
    handler.getNextDelay(); // Attempt 2
    expect(handler.shouldReconnect()).toBe(true);
    handler.getNextDelay(); // Attempt 3
    expect(handler.shouldReconnect()).toBe(false);
  });

  it('should reset attempts on successful reconnection', () => {
    const handler = new ReconnectHandler(3, 100);
    handler.getNextDelay();
    expect(handler.getAttempts()).toBe(1);

    handler.reset();
    expect(handler.getAttempts()).toBe(0);
    expect(handler.shouldReconnect()).toBe(true);
  });
});

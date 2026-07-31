export class ReconnectHandler {
  private attempts = 0;
  private maxAttempts: number;
  private baseIntervalMs: number;

  constructor(maxAttempts = 5, baseIntervalMs = 2000) {
    this.maxAttempts = maxAttempts;
    this.baseIntervalMs = baseIntervalMs;
  }

  public shouldReconnect(): boolean {
    return this.attempts < this.maxAttempts;
  }

  public getNextDelay(): number {
    this.attempts++;
    // Exponential backoff with 1.5 multiplier and jitter
    const delay = this.baseIntervalMs * Math.pow(1.5, this.attempts - 1);
    return Math.min(delay, 30000);
  }

  public reset(): void {
    this.attempts = 0;
  }

  public getAttempts(): number {
    return this.attempts;
  }
}

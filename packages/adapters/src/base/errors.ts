export class AdapterError extends Error {
  public readonly code: string;
  public readonly adapterName: string;
  public readonly causeDetails?: unknown;

  constructor(message: string, code: string, adapterName: string, causeDetails?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.adapterName = adapterName;
    this.causeDetails = causeDetails;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AdapterInitializationError extends AdapterError {
  constructor(adapterName: string, reason: string, causeDetails?: unknown) {
    super(
      `Failed to initialize AI adapter '${adapterName}': ${reason}`,
      'ADAPTER_INITIALIZATION_ERROR',
      adapterName,
      causeDetails
    );
  }
}

export class AdapterUnavailableError extends AdapterError {
  constructor(adapterName: string, reason: string = 'Provider service is unavailable') {
    super(
      `AI adapter '${adapterName}' is unavailable: ${reason}`,
      'ADAPTER_UNAVAILABLE_ERROR',
      adapterName
    );
  }
}

export class AdapterTimeoutError extends AdapterError {
  constructor(adapterName: string, timeoutMs: number) {
    super(
      `AI adapter '${adapterName}' timed out after ${timeoutMs}ms`,
      'ADAPTER_TIMEOUT_ERROR',
      adapterName
    );
  }
}

export class AdapterExecutionError extends AdapterError {
  constructor(adapterName: string, reason: string, causeDetails?: unknown) {
    super(
      `AI adapter '${adapterName}' execution failed: ${reason}`,
      'ADAPTER_EXECUTION_ERROR',
      adapterName,
      causeDetails
    );
  }
}

export class AdapterCancellationError extends AdapterError {
  constructor(adapterName: string, reason: string = 'Prompt execution was cancelled') {
    super(
      `AI adapter '${adapterName}' prompt cancelled: ${reason}`,
      'ADAPTER_CANCELLATION_ERROR',
      adapterName
    );
  }
}

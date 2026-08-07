/**
 * Minimal debug logger for adapter layer operations.
 */
export function debugLog(message: string, error?: unknown): void {
  if (process.env.DEBUG || process.env.VERBOSE || process.env.NODE_ENV === 'development') {
    const detail = error ? `: ${error instanceof Error ? error.message : String(error)}` : '';
    console.debug(`[Adapter Debug] ${message}${detail}`);
  }
}

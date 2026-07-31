import { execSync } from 'node:child_process';
import type { AdapterHealth } from '../base/adapter.js';

export class GeminiHealthChecker {
  private binaryName: string;
  private mockMode: boolean;

  constructor(binaryName: string = 'gemini', mockMode: boolean = false) {
    this.binaryName = binaryName;
    this.mockMode = mockMode;
  }

  public async checkHealth(currentStatus: string): Promise<AdapterHealth> {
    const startTime = Date.now();

    if (this.mockMode) {
      return {
        ok: true,
        message: `Gemini CLI (mock mode ready). Status: ${currentStatus}`,
        latencyMs: 1,
      };
    }

    try {
      // Check binary availability & version
      const output = execSync(`${this.binaryName} --version`, {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      const latencyMs = Date.now() - startTime;
      const versionStr = output.trim();

      return {
        ok: true,
        message: `Gemini CLI available (${versionStr}). Status: ${currentStatus}`,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      return {
        ok: false,
        message: `Gemini CLI health check failed: ${errorMsg}. Status: ${currentStatus}`,
        latencyMs,
      };
    }
  }
}

import { execSync } from 'node:child_process';
import type { AdapterHealth } from '../base/adapter.js';

export interface GeminiHealthInfo {
  ok: boolean;
  version?: string;
  authenticated?: boolean;
  executable?: string;
  error?: string;
}

export class GeminiHealthChecker {
  private binaryName: string;
  private mockMode: boolean;

  constructor(binaryName: string = 'gemini', mockMode: boolean = false) {
    this.binaryName = binaryName;
    this.mockMode = mockMode;
  }

  public async checkDetailedHealth(): Promise<GeminiHealthInfo> {
    if (this.mockMode || process.env.GEMINI_MOCK === 'true') {
      return {
        ok: true,
        version: '1.5.0-mock',
        authenticated: true,
        executable: `/usr/bin/${this.binaryName}`,
      };
    }

    let executablePath = this.binaryName;
    try {
      const whichOut = execSync(`which ${this.binaryName}`, {
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      executablePath = whichOut.trim() || this.binaryName;
    } catch {
      // Fall back to binaryName if which is not available or fails
    }

    let versionStr = '1.0.0';
    try {
      const output = execSync(`${this.binaryName} --version`, {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      versionStr = output.trim() || '1.0.0';
    } catch (err) {
      return {
        ok: false,
        executable: executablePath,
        authenticated: false,
        error: `Gemini CLI executable not found or failed to launch. Please install Gemini CLI. (${err instanceof Error ? err.message : String(err)})`,
      };
    }

    // Check authentication status
    try {
      // Run auth check command or dry-run help
      const authOut = execSync(`${this.binaryName} auth status`, {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (authOut.includes('not logged in') || authOut.includes('unauthenticated')) {
        return {
          ok: false,
          version: versionStr,
          executable: executablePath,
          authenticated: false,
          error: 'Gemini CLI is not authenticated. Please run `gemini auth login` outside Collagility.',
        };
      }
    } catch {
      // If auth status subcommand is not supported or returns error, check general CLI readiness
    }

    return {
      ok: true,
      version: versionStr,
      authenticated: true,
      executable: executablePath,
    };
  }

  public async checkHealth(currentStatus: string): Promise<AdapterHealth> {
    const startTime = Date.now();
    const detailed = await this.checkDetailedHealth();

    return {
      ok: detailed.ok,
      message: detailed.ok
        ? `Gemini CLI available (${detailed.version}). Status: ${currentStatus}`
        : `Gemini CLI health check failed: ${detailed.error}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

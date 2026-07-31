import { execSync } from 'node:child_process';
import type { AdapterHealth } from '../base/adapter.js';

export interface GeminiHealthInfo {
  ok: boolean;
  version?: string;
  authenticated?: boolean;
  executable?: string;
  error?: string;
  detectedBinary?: string;
}

export class GeminiHealthChecker {
  private binaryName: string;
  private mockMode: boolean;
  private overrideVersion?: string;

  constructor(binaryName: string = 'agy', mockMode: boolean = false, overrideVersion?: string) {
    this.binaryName = binaryName;
    this.mockMode = mockMode;
    this.overrideVersion = overrideVersion;
  }

  public async checkDetailedHealth(): Promise<GeminiHealthInfo> {
    if (this.mockMode || process.env.GEMINI_MOCK === 'true') {
      return {
        ok: true,
        version: this.overrideVersion || '1.5.0-mock',
        authenticated: true,
        executable: `/usr/bin/${this.binaryName}`,
        detectedBinary: this.binaryName,
      };
    }

    const candidateBinaries =
      this.binaryName === 'agy' || this.binaryName === 'gemini'
        ? ['agy', 'antigravity', 'gemini']
        : [this.binaryName];

    let selectedBinary: string | null = null;
    let executablePath = '';

    for (const cand of candidateBinaries) {
      try {
        const whichOut = execSync(`which ${cand}`, {
          encoding: 'utf-8',
          timeout: 2000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const path = whichOut.trim();
        if (path) {
          selectedBinary = cand;
          executablePath = path;
          break;
        }
      } catch {
        // Continue checking candidates
      }
    }

    if (!selectedBinary) {
      return {
        ok: false,
        error: `Neither 'agy', 'antigravity', nor 'gemini' CLI executable was found in PATH. Please install Antigravity CLI (agy) or run 'collagility start --mock' for mock mode.`,
      };
    }

    let versionStr = this.overrideVersion || '2.2.1';
    if (!this.overrideVersion) {
      try {
        const output = execSync(`${selectedBinary} --version`, {
          encoding: 'utf-8',
          timeout: 3000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const trimmed = output.trim();
        if (trimmed && !trimmed.includes('DevTools') && !trimmed.includes('ERROR')) {
          versionStr = trimmed;
        }
      } catch {
        // Use default fallback version if --version produces electron/ide output
      }
    }

    return {
      ok: true,
      version: versionStr,
      authenticated: true,
      executable: executablePath,
      detectedBinary: selectedBinary,
    };
  }

  public async checkHealth(currentStatus: string): Promise<AdapterHealth> {
    const startTime = Date.now();
    const detailed = await this.checkDetailedHealth();

    return {
      ok: detailed.ok,
      message: detailed.ok
        ? `${detailed.detectedBinary || 'AI'} CLI available (${detailed.version}). Status: ${currentStatus}`
        : `AI CLI health check failed: ${detailed.error}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

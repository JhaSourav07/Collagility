import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AdapterHealth } from '../base/adapter.js';

export interface AntigravityHealthInfo {
  ok: boolean;
  version?: string;
  executable?: string;
  detectedBinary?: string;
  error?: string;
}

export class AntigravityHealthChecker {
  private binaryName: string;
  private mockMode: boolean;
  private overrideVersion?: string;

  constructor(binaryName: string = 'agy', mockMode: boolean = false, overrideVersion?: string) {
    this.binaryName = binaryName;
    this.mockMode = mockMode;
    this.overrideVersion = overrideVersion;
  }

  public async checkDetailedHealth(): Promise<AntigravityHealthInfo> {
    if (this.mockMode || process.env.ANTIGRAVITY_MOCK === 'true' || process.env.GEMINI_MOCK === 'true') {
      return {
        ok: true,
        version: this.overrideVersion || '1.0.0-mock',
        executable: `/usr/local/bin/${this.binaryName}`,
        detectedBinary: this.binaryName,
      };
    }

    const homeDir = os.homedir();
    const isWindows = process.platform === 'win32';
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');

    // Known installation paths for Google Antigravity CLI (agy)
    const platformSpecificPaths: string[] = [];

    if (isWindows) {
      platformSpecificPaths.push(
        path.join(localAppData, 'agy', 'bin', `${this.binaryName}.exe`),
        path.join(localAppData, 'agy', 'bin', `${this.binaryName}.cmd`),
        path.join(localAppData, 'agy', 'bin', this.binaryName),
        path.join(localAppData, 'agy', 'bin', 'agy.exe'),
        path.join(localAppData, 'agy', 'bin', 'antigravity.exe')
      );
    } else {
      platformSpecificPaths.push(
        path.join(homeDir, '.local', 'bin', this.binaryName),
        path.join(homeDir, '.local', 'bin', 'agy'),
        path.join(homeDir, '.local', 'bin', 'antigravity')
      );
    }

    // 1. Check platform-specific installation paths
    for (const candidatePath of platformSpecificPaths) {
      if (fs.existsSync(candidatePath)) {
        return this.verifyExecutable(candidatePath, this.binaryName);
      }
    }

    // 2. Check candidates in PATH using shell lookup
    const candidateBinaries =
      this.binaryName === 'agy' || this.binaryName === 'antigravity'
        ? ['agy', 'antigravity']
        : [this.binaryName];

    for (const cand of candidateBinaries) {
      try {
        const cmd = isWindows ? `where ${cand}` : `which ${cand}`;
        const output = execSync(cmd, {
          encoding: 'utf-8',
          timeout: 2000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const foundPath = output.split(/\r?\n/)[0]?.trim();
        if (foundPath && fs.existsSync(foundPath)) {
          return this.verifyExecutable(foundPath, cand);
        }
      } catch {
        // Continue checking candidates
      }
    }

    return {
      ok: false,
      error: `Antigravity CLI ('${this.binaryName}') not found in PATH or platform install path (~/.local/bin/agy or AppData/Local/agy/bin).`,
    };
  }

  private verifyExecutable(executablePath: string, binaryName: string): AntigravityHealthInfo {
    let versionStr = this.overrideVersion || '1.0.0';
    if (!this.overrideVersion) {
      try {
        const output = execSync(`"${executablePath}" --version`, {
          encoding: 'utf-8',
          timeout: 3000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const trimmed = output.trim();
        if (trimmed && !trimmed.includes('ERROR')) {
          versionStr = trimmed;
        }
      } catch {
        // Use default version if --version produces error
      }
    }

    return {
      ok: true,
      version: versionStr,
      executable: executablePath,
      detectedBinary: binaryName,
    };
  }

  public async checkHealth(currentStatus: string): Promise<AdapterHealth> {
    const startTime = Date.now();
    const detailed = await this.checkDetailedHealth();

    return {
      ok: detailed.ok,
      message: detailed.ok
        ? `Antigravity CLI available (${detailed.version}). Executable: ${detailed.executable}. Status: ${currentStatus}`
        : `Antigravity CLI health check failed: ${detailed.error}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

import { spawn, type ChildProcess } from 'node:child_process';
import { GeminiStdoutHandler } from './stdout.js';
import { GeminiStderrHandler } from './stderr.js';
import { GeminiLifecycleManager } from './lifecycle.js';
import { AdapterExecutionError } from '../base/errors.js';

export interface ProcessOptions {
  binaryPath?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  mockProcessFactory?: () => ChildProcess;
}

export class GeminiProcessManager {
  private childProcess: ChildProcess | null = null;
  private binaryPath: string;
  private args: string[];
  private options: ProcessOptions;

  public readonly stdoutHandler: GeminiStdoutHandler;
  public readonly stderrHandler: GeminiStderrHandler;
  public readonly lifecycle: GeminiLifecycleManager;

  private onExitCallback?: (code: number | null, signal: NodeJS.Signals | null) => void;
  private onErrorCallback?: (err: Error) => void;

  constructor(
    options: ProcessOptions = {},
    stdoutHandler = new GeminiStdoutHandler(),
    stderrHandler = new GeminiStderrHandler(),
    lifecycle = new GeminiLifecycleManager()
  ) {
    this.options = options;
    this.binaryPath = options.binaryPath ?? 'gemini';
    this.args = options.args ?? [];
    this.stdoutHandler = stdoutHandler;
    this.stderrHandler = stderrHandler;
    this.lifecycle = lifecycle;
  }

  public onExit(callback: (code: number | null, signal: NodeJS.Signals | null) => void): void {
    this.onExitCallback = callback;
  }

  public onError(callback: (err: Error) => void): void {
    this.onErrorCallback = callback;
  }

  public isRunning(): boolean {
    return this.childProcess !== null && this.childProcess.exitCode === null && !this.childProcess.killed;
  }

  public spawnProcess(): ChildProcess {
    if (this.isRunning()) {
      return this.childProcess!;
    }

    this.stdoutHandler.clear();
    this.stderrHandler.clear();

    if (this.options.mockProcessFactory) {
      this.childProcess = this.options.mockProcessFactory();
    } else {
      this.childProcess = spawn(this.binaryPath, this.args, {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    if (this.childProcess.stdout) {
      this.childProcess.stdout.on('data', (chunk) => this.stdoutHandler.handleData(chunk));
    }

    if (this.childProcess.stderr) {
      this.childProcess.stderr.on('data', (chunk) => this.stderrHandler.handleData(chunk));
    }

    this.childProcess.on('error', (err) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    });

    this.childProcess.on('exit', (code, signal) => {
      this.stdoutHandler.flush();
      const proc = this.childProcess;
      this.childProcess = null;

      if (this.onExitCallback) {
        this.onExitCallback(code, signal);
      }
    });

    return this.childProcess;
  }

  public getStdin() {
    return this.childProcess?.stdin ?? null;
  }

  public killProcess(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill(signal);
    }
  }
}

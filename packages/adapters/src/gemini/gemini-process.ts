import { spawn, type ChildProcess } from 'node:child_process';
import { GeminiStdoutHandler } from './stdout.js';
import { GeminiStderrHandler } from './stderr.js';
import { GeminiLifecycleManager } from './lifecycle.js';

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

  public spawnProcessForPrompt(prompt: string): ChildProcess {
    if (this.isRunning()) {
      this.killProcess('SIGTERM');
    }

    this.stdoutHandler.clear();
    this.stderrHandler.clear();

    if (this.options.mockProcessFactory) {
      this.childProcess = this.options.mockProcessFactory();
    } else {
      const cwd = this.options.cwd || process.cwd();
      const procArgs =
        this.args.length > 0
          ? [...this.args, prompt]
          : ['--dangerously-skip-permissions', '--add-dir', cwd, '-p', prompt];

      this.childProcess = spawn(this.binaryPath, procArgs, {
        cwd,
        env: {
          ...process.env,
          FORCE_COLOR: '1',
          COLORTERM: 'truecolor',
          TERM: 'xterm-256color',
          ...this.options.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
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
      this.childProcess = null;

      if (this.onExitCallback) {
        this.onExitCallback(code, signal);
      }
    });

    return this.childProcess;
  }

  public spawnProcess(): ChildProcess {
    return this.spawnProcessForPrompt('');
  }

  public getStdin() {
    return this.childProcess?.stdin ?? null;
  }

  public killProcess(signal: NodeJS.Signals = 'SIGTERM'): void {
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill(signal);
      this.childProcess = null;
    }
  }
}

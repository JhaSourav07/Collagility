import { execFile, spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { promisify } from 'node:util';

export type ExecFileFunction = (
  file: string,
  args?: readonly string[] | null
) => Promise<{ stdout: string; stderr: string }>;

export type SpawnFunction = (
  command: string,
  args: readonly string[],
  options: SpawnOptions
) => ChildProcess;

const defaultExecFileAsync: ExecFileFunction = promisify(execFile);
const defaultSpawn: SpawnFunction = (cmd, args, opts) => spawn(cmd, args, opts);

export class TmuxSession {
  private execFileFn: ExecFileFunction;
  private spawnFn: SpawnFunction;

  constructor(
    execFileFn: ExecFileFunction = defaultExecFileAsync,
    spawnFn: SpawnFunction = defaultSpawn
  ) {
    this.execFileFn = execFileFn;
    this.spawnFn = spawnFn;
  }

  private async runTmux(args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      return await this.execFileFn('tmux', args);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; stderr?: string; stdout?: string };
      const stderr = errorObj.stderr ? errorObj.stderr.trim() : '';
      const message = errorObj.message || String(err);
      const detail = stderr ? `tmux stderr: ${stderr}` : message;
      throw new Error(`tmux command failed ['tmux ${args.join(' ')}']: ${detail}`);
    }
  }

  public async sessionExists(name: string): Promise<boolean> {
    try {
      await this.execFileFn('tmux', ['has-session', '-t', name]);
      return true;
    } catch {
      return false;
    }
  }

  public async createSplitSession(
    name: string,
    leftCommand: string[],
    rightCommand: string[],
    rightPanePercent = 62
  ): Promise<void> {
    await this.runTmux(['new-session', '-d', '-s', name, ...leftCommand]);
    await this.runTmux([
      'split-window',
      '-d',
      '-h',
      '-t',
      name,
      '-p',
      String(rightPanePercent),
      ...rightCommand,
    ]);
    // UX discouragement: Disable mouse selection so accidental clicks into the right pane
    // do not grab focus away from the chat pane. This is not a hard security boundary —
    // users with physical attach access can still switch panes via tmux prefix shortcuts
    // (e.g. Ctrl+B Arrow), which is an accepted limitation for v1.
    await this.runTmux(['set-window-option', '-t', name, 'mouse', 'off']);
  }

  public attach(name: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const child = this.spawnFn('tmux', ['attach-session', '-t', name], {
        stdio: 'inherit',
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('exit', (code) => {
        resolve(code);
      });
    });
  }

  public async sendKeys(name: string, paneIndex: 0 | 1, keys: string): Promise<void> {
    await this.runTmux(['send-keys', '-t', `${name}.${paneIndex}`, keys, 'Enter']);
  }

  public async pipePane(name: string, paneIndex: 0 | 1, targetPath: string): Promise<void> {
    await this.runTmux(['pipe-pane', '-t', `${name}.${paneIndex}`, '-O', `cat >> ${targetPath}`]);
  }

  public async killSession(name: string): Promise<void> {
    await this.runTmux(['kill-session', '-t', name]);
  }
}

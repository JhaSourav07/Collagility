import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export type ExecFileFunction = (
  file: string,
  args?: readonly string[] | null
) => Promise<{ stdout: string; stderr: string }>;

const defaultExecFileAsync: ExecFileFunction = promisify(execFile);

export class TmuxSession {
  private execFileFn: ExecFileFunction;

  constructor(execFileFn: ExecFileFunction = defaultExecFileAsync) {
    this.execFileFn = execFileFn;
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
      '-h',
      '-t',
      name,
      '-p',
      String(rightPanePercent),
      ...rightCommand,
    ]);
  }

  public async attach(name: string): Promise<void> {
    await this.runTmux(['attach-session', '-t', name]);
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

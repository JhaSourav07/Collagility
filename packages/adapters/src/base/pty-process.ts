import * as pty from 'node-pty';
import { Terminal } from '@xterm/headless';
import type { SecurityMode, RiskLevel } from '@collagility/protocol';

export interface StyledRun {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface IPtyLike {
  onData: (listener: (data: string) => void) => { dispose(): void };
  onExit: (listener: (e: { exitCode: number; signal?: number }) => void) => { dispose(): void };
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
}

export type PtyFactory = (
  file: string,
  args: string[] | string,
  options: pty.IPtyForkOptions | pty.IWindowsPtyForkOptions
) => IPtyLike;

export interface AgentPtyOptions {
  binaryPath: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  mockPtyFactory?: PtyFactory;
}

export class AgentPtyProcess {
  private ptyProcess: IPtyLike | null = null;
  private terminal: Terminal;
  private options: AgentPtyOptions;

  private dataCallbacks: Array<(data: string) => void> = [];
  private exitCallbacks: Array<(e: { exitCode: number; signal?: number }) => void> = [];

  constructor(options: AgentPtyOptions) {
    this.options = options;
    const cols = options.cols ?? 80;
    const rows = options.rows ?? 24;

    this.terminal = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
    });
  }

  public spawn(): IPtyLike {
    const cols = this.options.cols ?? 80;
    const rows = this.options.rows ?? 24;
    const cwd = this.options.cwd || process.cwd();

    const ptyOptions: pty.IPtyForkOptions = {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        COLORTERM: 'truecolor',
        TERM: 'xterm-256color',
        ...this.options.env,
      },
    };

    const file = this.options.binaryPath;
    const args = this.options.args || [];

    if (this.options.mockPtyFactory) {
      this.ptyProcess = this.options.mockPtyFactory(file, args, ptyOptions);
    } else {
      this.ptyProcess = pty.spawn(file, args, ptyOptions);
    }

    this.ptyProcess.onData((data: string) => {
      this.terminal.write(data);
      for (const cb of this.dataCallbacks) {
        cb(data);
      }
    });

    this.ptyProcess.onExit((event: { exitCode: number; signal?: number }) => {
      for (const cb of this.exitCallbacks) {
        cb(event);
      }
    });

    return this.ptyProcess;
  }

  public write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  public resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  public onData(callback: (data: string) => void): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter((cb) => cb !== callback);
    };
  }

  public onExit(callback: (e: { exitCode: number; signal?: number }) => void): () => void {
    this.exitCallbacks.push(callback);
    return () => {
      this.exitCallbacks = this.exitCallbacks.filter((cb) => cb !== callback);
    };
  }

  public kill(signal?: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill(signal);
      this.ptyProcess = null;
    }
  }

  public scrollLines(amount: number): void {
    this.terminal.scrollLines(amount);
  }

  public scrollPages(pageCount: number): void {
    this.terminal.scrollPages(pageCount);
  }

  public scrollToTop(): void {
    this.terminal.scrollToTop();
  }

  public scrollToBottom(): void {
    this.terminal.scrollToBottom();
  }

  public getScreenSnapshot(): StyledRun[][] {
    const buffer = this.terminal.buffer.active;
    const cols = this.terminal.cols;
    const rows = this.terminal.rows;
    const result: StyledRun[][] = [];

    const nullCell = buffer.getNullCell();

    for (let y = 0; y < rows; y++) {
      const lineIndex = buffer.viewportY + y;
      const line = buffer.getLine(lineIndex);
      const rowRuns: StyledRun[] = [];

      if (!line) {
        rowRuns.push({ text: ' '.repeat(cols) });
        result.push(rowRuns);
        continue;
      }

      let currentRun: StyledRun | null = null;

      for (let x = 0; x < cols; x++) {
        const cell = line.getCell(x, nullCell);
        const char = cell ? cell.getChars() || ' ' : ' ';

        const fg = cell
          ? cell.isFgRGB()
            ? `#${cell.getFgColor().toString(16).padStart(6, '0')}`
            : cell.isFgPalette()
            ? String(cell.getFgColor())
            : undefined
          : undefined;

        const bg = cell
          ? cell.isBgRGB()
            ? `#${cell.getBgColor().toString(16).padStart(6, '0')}`
            : cell.isBgPalette()
            ? String(cell.getBgColor())
            : undefined
          : undefined;

        const bold = cell ? Boolean(cell.isBold()) : undefined;
        const dim = cell ? Boolean(cell.isDim()) : undefined;
        const italic = cell ? Boolean(cell.isItalic()) : undefined;
        const underline = cell ? Boolean(cell.isUnderline()) : undefined;

        const style: Omit<StyledRun, 'text'> = {};
        if (fg !== undefined) style.fg = fg;
        if (bg !== undefined) style.bg = bg;
        if (bold) style.bold = true;
        if (dim) style.dim = true;
        if (italic) style.italic = true;
        if (underline) style.underline = true;

        if (currentRun && isSameStyle(currentRun, style)) {
          currentRun.text += char;
        } else {
          if (currentRun) {
            rowRuns.push(currentRun);
          }
          currentRun = {
            text: char,
            ...style,
          };
        }
      }

      if (currentRun) {
        rowRuns.push(currentRun);
      }

      result.push(rowRuns);
    }

    return result;
  }
}

function isSameStyle(run: StyledRun, style: Omit<StyledRun, 'text'>): boolean {
  return (
    run.fg === style.fg &&
    run.bg === style.bg &&
    Boolean(run.bold) === Boolean(style.bold) &&
    Boolean(run.dim) === Boolean(style.dim) &&
    Boolean(run.italic) === Boolean(style.italic) &&
    Boolean(run.underline) === Boolean(style.underline)
  );
}

export function isPermissionRequiredForMode(securityMode: SecurityMode, riskLevel: RiskLevel): boolean {
  switch (securityMode) {
    case 'auto':
      return false;
    case 'accept-edits':
      return riskLevel === 'HIGH';
    case 'plan-only':
    case 'manual':
    default:
      return riskLevel === 'MEDIUM' || riskLevel === 'HIGH';
  }
}

export interface PtyAutoApprovalOptions {
  securityMode: SecurityMode;
  evaluateRisk?: (commandOrChunk: string) => RiskLevel;
  approvalKeystroke?: string;
}

export function processPtyAutoApproval(
  chunk: string,
  options: PtyAutoApprovalOptions,
  writeToPty: (keystroke: string) => void
): boolean {
  if (options.securityMode === 'manual') {
    return false;
  }

  const isPrompt = /\[y\/n\]|\[Y\/n\]|\[y\/N\]|\bproceed\?|\bconfirm\?|\bdo you want to\b/i.test(chunk);
  if (!isPrompt) {
    return false;
  }

  const riskLevel = options.evaluateRisk ? options.evaluateRisk(chunk) : 'LOW';
  const isRequired = isPermissionRequiredForMode(options.securityMode, riskLevel);

  if (!isRequired) {
    const keystroke = options.approvalKeystroke || '\r';
    writeToPty(keystroke);
    return true;
  }

  return false;
}

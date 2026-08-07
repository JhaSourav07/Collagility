import { Terminal } from '@xterm/headless';

export interface PtyScreenBufferOptions {
  cols?: number;
  rows?: number;
  scrollback?: number;
}

export interface PtyCellInfo {
  char: string;
  width: number;
}

export interface PtyRowInfo {
  index: number;
  text: string;
  cells: PtyCellInfo[];
}

export class PtyScreenBuffer {
  private terminal: Terminal;
  private cols: number;
  private rows: number;

  constructor(options: PtyScreenBufferOptions = {}) {
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.terminal = new Terminal({
      cols: this.cols,
      rows: this.rows,
      scrollback: options.scrollback || 1000,
      allowProposedApi: true,
    });
  }

  public write(data: string, callback?: () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!data) {
        if (callback) callback();
        resolve();
        return;
      }
      this.terminal.write(data, () => {
        if (callback) callback();
        resolve();
      });
    });
  }

  public resize(cols: number, rows: number): void {
    if (cols > 0 && rows > 0 && (cols !== this.cols || rows !== this.rows)) {
      this.cols = cols;
      this.rows = rows;
      this.terminal.resize(cols, rows);
    }
  }

  public getVisibleLines(): string[] {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];

    for (let i = 0; i < this.rows; i++) {
      const line = buffer.getLine(buffer.viewportY + i);
      lines.push(line ? line.translateToString(true) : '');
    }

    return lines;
  }

  public getVisibleRowsDetailed(): PtyRowInfo[] {
    const buffer = this.terminal.buffer.active;
    const rows: PtyRowInfo[] = [];

    for (let i = 0; i < this.rows; i++) {
      const line = buffer.getLine(buffer.viewportY + i);
      const text = line ? line.translateToString(true) : '';
      const cells: PtyCellInfo[] = [];

      if (line) {
        for (let x = 0; x < this.cols; x++) {
          const cell = line.getCell(x);
          cells.push({
            char: cell ? cell.getChars() || ' ' : ' ',
            width: cell ? cell.getWidth() : 1,
          });
        }
      }

      rows.push({
        index: i,
        text,
        cells,
      });
    }

    return rows;
  }

  public clear(): void {
    this.terminal.clear();
    this.terminal.reset();
  }

  public getDimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }
}

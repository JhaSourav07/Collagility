export interface ScreenCell {
  char: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export function createEmptyCell(): ScreenCell {
  return { char: ' ' };
}

export class VirtualScreen {
  public width: number;
  public height: number;
  private buffer: ScreenCell[][];

  constructor(width = 80, height = 24) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.buffer = this.createGrid(this.width, this.height);
  }

  private createGrid(w: number, h: number): ScreenCell[][] {
    const grid: ScreenCell[][] = [];
    for (let y = 0; y < h; y++) {
      const row: ScreenCell[] = [];
      for (let x = 0; x < w; x++) {
        row.push(createEmptyCell());
      }
      grid.push(row);
    }
    return grid;
  }

  public getCell(x: number, y: number): ScreenCell | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return undefined;
    }
    return this.buffer[y][x];
  }

  public setCell(x: number, y: number, cell: Partial<ScreenCell>): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const current = this.buffer[y][x];
    this.buffer[y][x] = {
      char: cell.char ?? current.char,
      fg: cell.fg ?? current.fg,
      bg: cell.bg ?? current.bg,
      bold: cell.bold ?? current.bold,
      dim: cell.dim ?? current.dim,
      italic: cell.italic ?? current.italic,
      underline: cell.underline ?? current.underline,
    };
    return true;
  }

  public writeString(
    x: number,
    y: number,
    text: string,
    style?: Omit<ScreenCell, 'char'>
  ): number {
    if (y < 0 || y >= this.height) return 0;
    let written = 0;
    for (let i = 0; i < text.length; i++) {
      const currentX = x + i;
      if (currentX >= this.width) break;
      if (currentX >= 0) {
        this.setCell(currentX, y, { char: text[i], ...style });
        written++;
      }
    }
    return written;
  }

  public clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.buffer[y][x] = createEmptyCell();
      }
    }
  }

  public resize(newWidth: number, newHeight: number): void {
    const w = Math.max(1, newWidth);
    const h = Math.max(1, newHeight);
    const newGrid = this.createGrid(w, h);

    for (let y = 0; y < Math.min(this.height, h); y++) {
      for (let x = 0; x < Math.min(this.width, w); x++) {
        newGrid[y][x] = { ...this.buffer[y][x] };
      }
    }

    this.width = w;
    this.height = h;
    this.buffer = newGrid;
  }

  public getRowString(y: number): string {
    if (y < 0 || y >= this.height) return '';
    return this.buffer[y].map((cell) => cell.char).join('');
  }

  public clone(): VirtualScreen {
    const copy = new VirtualScreen(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        copy.buffer[y][x] = { ...this.buffer[y][x] };
      }
    }
    return copy;
  }
}

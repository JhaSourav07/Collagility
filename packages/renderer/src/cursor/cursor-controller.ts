export interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

export class CursorController {
  private x = 0;
  private y = 0;
  private visible = true;

  public getPosition(): CursorPosition {
    return { x: this.x, y: this.y, visible: this.visible };
  }

  public moveTo(x: number, y: number): string {
    this.x = Math.max(0, x);
    this.y = Math.max(0, y);
    // Terminal 1-indexed ANSI position sequence: \x1b[row;colH
    return `\x1b[${this.y + 1};${this.x + 1}H`;
  }

  public hide(): string {
    this.visible = false;
    return '\x1b[?25l';
  }

  public show(): string {
    this.visible = true;
    return '\x1b[?25h';
  }

  public clearLine(): string {
    return '\x1b[2K';
  }

  public clearScreen(): string {
    return '\x1b[2J\x1b[H';
  }

  public savePosition(): string {
    return '\x1b[s';
  }

  public restorePosition(): string {
    return '\x1b[u';
  }
}

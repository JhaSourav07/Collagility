import type { VirtualScreen, ScreenCell } from '../screen/virtual-screen.js';

export interface DiffPatch {
  x: number;
  y: number;
  cell: ScreenCell;
}

export class ScreenDiffRenderer {
  public static compareCells(a: ScreenCell, b: ScreenCell): boolean {
    return (
      a.char === b.char &&
      a.fg === b.fg &&
      a.bg === b.bg &&
      a.bold === b.bold &&
      a.dim === b.dim &&
      a.italic === b.italic &&
      a.underline === b.underline
    );
  }

  public computeDiff(prev: VirtualScreen, next: VirtualScreen): DiffPatch[] {
    const patches: DiffPatch[] = [];
    const minWidth = Math.min(prev.width, next.width);
    const minHeight = Math.min(prev.height, next.height);

    for (let y = 0; y < minHeight; y++) {
      for (let x = 0; x < minWidth; x++) {
        const prevCell = prev.getCell(x, y);
        const nextCell = next.getCell(x, y);

        if (prevCell && nextCell && !ScreenDiffRenderer.compareCells(prevCell, nextCell)) {
          patches.push({ x, y, cell: nextCell });
        }
      }
    }

    // Handle extra rows if screen expanded
    if (next.height > prev.height) {
      for (let y = prev.height; y < next.height; y++) {
        for (let x = 0; x < next.width; x++) {
          const nextCell = next.getCell(x, y);
          if (nextCell) patches.push({ x, y, cell: nextCell });
        }
      }
    }

    return patches;
  }
}

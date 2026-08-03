import { VirtualScreen } from '../screen/virtual-screen.js';
import { RegionManager } from '../layout/region-manager.js';
import { CursorController } from '../cursor/cursor-controller.js';
import { ScreenDiffRenderer, type DiffPatch } from '../diff/screen-diff.js';

export class ANSIEngine {
  public screen: VirtualScreen;
  public prevScreen: VirtualScreen;
  public regionManager: RegionManager;
  public cursorController: CursorController;
  public diffRenderer: ScreenDiffRenderer;

  constructor(width = 80, height = 24) {
    this.screen = new VirtualScreen(width, height);
    this.prevScreen = new VirtualScreen(width, height);
    this.regionManager = new RegionManager(width, height);
    this.cursorController = new CursorController();
    this.diffRenderer = new ScreenDiffRenderer();
  }

  public resize(width: number, height: number): string {
    this.screen.resize(width, height);
    this.prevScreen.resize(width, height);
    this.regionManager.updateScreenDimensions(width, height);
    return this.cursorController.clearScreen();
  }

  public renderDocumentToScreen(documentContent: string): DiffPatch[] {
    const lines = documentContent.split(/\r?\n/);
    this.screen.clear();

    for (let y = 0; y < Math.min(lines.length, this.screen.height); y++) {
      this.screen.writeString(0, y, lines[y]);
    }

    const patches = this.diffRenderer.computeDiff(this.prevScreen, this.screen);
    this.prevScreen = this.screen.clone();
    return patches;
  }

  public generateANSIPatches(patches: DiffPatch[]): string {
    let output = '';
    for (const patch of patches) {
      output += this.cursorController.moveTo(patch.x, patch.y);
      output += patch.cell.char;
    }
    return output;
  }
}

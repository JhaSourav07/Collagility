import { VirtualScreen } from '../screen/virtual-screen.js';
import { CursorController } from '../cursor/cursor-controller.js';
import { ScreenDiffRenderer, type DiffPatch } from '../diff/screen-diff.js';

export type StreamState = 'typing' | 'thinking' | 'searching' | 'reading' | 'writing' | 'complete';

export interface StreamChunkPayload {
  streamId: string;
  state: StreamState;
  content?: string;
  target?: string;
  durationMs?: number;
}

export class IncrementalStreamEngine {
  public screen: VirtualScreen;
  public prevScreen: VirtualScreen;
  public cursorController: CursorController;
  public diffRenderer: ScreenDiffRenderer;

  private activeRow = 0;
  private activeCol = 0;
  private accumulatedText = '';
  private currentState: StreamState = 'typing';

  constructor(width = 80, height = 24) {
    this.screen = new VirtualScreen(width, height);
    this.prevScreen = new VirtualScreen(width, height);
    this.cursorController = new CursorController();
    this.diffRenderer = new ScreenDiffRenderer();
  }

  public getCurrentState(): StreamState {
    return this.currentState;
  }

  public processChunk(payload: StreamChunkPayload): { patches: DiffPatch[]; ansiOutput: string } {
    this.currentState = payload.state;

    if (payload.state === 'complete') {
      const line = `✓ Stream Complete (${payload.durationMs || 0}ms)`;
      this.screen.writeString(0, this.activeRow, line);
      this.activeRow = Math.min(this.activeRow + 1, this.screen.height - 1);
      this.activeCol = 0;
    } else if (payload.state === 'thinking') {
      const line = `▸ Thought for ${((payload.durationMs || 1000) / 1000).toFixed(1)}s`;
      this.screen.writeString(0, this.activeRow, line);
    } else if (payload.state === 'searching') {
      const line = `● Search(${payload.target || ''})`;
      this.screen.writeString(0, this.activeRow, line);
    } else if (payload.state === 'reading') {
      const line = `● Read(${payload.target || 'file.ts'})`;
      this.screen.writeString(0, this.activeRow, line);
    } else if (payload.state === 'writing') {
      const line = `● Write(${payload.target || 'file.ts'})`;
      this.screen.writeString(0, this.activeRow, line);
    } else if (payload.state === 'typing' && payload.content) {
      this.accumulatedText += payload.content;
      const lines = this.accumulatedText.split(/\r?\n/);
      const lastLineIndex = lines.length - 1;

      for (let i = 0; i < lines.length; i++) {
        const targetY = this.activeRow + i;
        if (targetY < this.screen.height) {
          this.screen.writeString(0, targetY, lines[i]);
        }
      }

      this.activeCol = lines[lastLineIndex].length % this.screen.width;
    }

    const patches = this.diffRenderer.computeDiff(this.prevScreen, this.screen);
    this.prevScreen = this.screen.clone();

    let ansiOutput = '';
    for (const patch of patches) {
      ansiOutput += this.cursorController.moveTo(patch.x, patch.y);
      ansiOutput += patch.cell.char;
    }

    return { patches, ansiOutput };
  }

  public reset(): void {
    this.screen.clear();
    this.prevScreen.clear();
    this.activeRow = 0;
    this.activeCol = 0;
    this.accumulatedText = '';
    this.currentState = 'typing';
  }
}

import { VirtualScreen } from '../screen/virtual-screen.js';
import { RegionManager, type RegionBounds } from './region-manager.js';
import { CursorController } from '../cursor/cursor-controller.js';

export interface NotificationToast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export class TerminalLayoutEngine {
  public screen: VirtualScreen;
  public regionManager: RegionManager;
  public cursorController: CursorController;

  private scrollOffset = 0;
  private timelineLines: string[] = [];
  private headerContent: string[] = [];
  private inputContent = '';
  private statusContent = '';
  private notifications: NotificationToast[] = [];

  constructor(width = 80, height = 24) {
    this.screen = new VirtualScreen(width, height);
    this.regionManager = new RegionManager(width, height);
    this.cursorController = new CursorController();
    this.recalculateRegions();
  }

  public recalculateRegions(): void {
    const h = this.screen.height;
    const w = this.screen.width;

    // Fixed Top Header (lines 0..3)
    this.regionManager.registerRegion('header', { x: 0, y: 0, width: w, height: 3 });

    // Scrollable Central Timeline Viewport (lines 3..h-4)
    const timelineHeight = Math.max(1, h - 6);
    this.regionManager.registerRegion('timeline', { x: 0, y: 3, width: w, height: timelineHeight });

    // Fixed Bottom Input (lines h-3..h-1) - NEVER MOVES
    this.regionManager.registerRegion('input', { x: 0, y: h - 3, width: w, height: 2 });

    // Fixed Bottom Status (line h-1)
    this.regionManager.registerRegion('status', { x: 0, y: h - 1, width: w, height: 1 });
  }

  public resize(width: number, height: number): void {
    this.screen.resize(width, height);
    this.regionManager.updateScreenDimensions(width, height);
    this.recalculateRegions();
  }

  public setHeader(lines: string[]): void {
    this.headerContent = lines;
  }

  public appendTimelineLine(line: string): void {
    this.timelineLines.push(line);
    this.scrollToBottom();
  }

  public setInputText(text: string): void {
    this.inputContent = text;
  }

  public setStatusText(text: string): void {
    this.statusContent = text;
  }

  public addNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.notifications.push({
      id: Math.random().toString(36).slice(2),
      message,
      type,
      timestamp: Date.now(),
    });
  }

  public scrollToBottom(): void {
    const timelineRegion = this.regionManager.getRegion('timeline');
    if (!timelineRegion) return;
    this.scrollOffset = Math.max(0, this.timelineLines.length - timelineRegion.height);
  }

  public scroll(delta: number): void {
    const timelineRegion = this.regionManager.getRegion('timeline');
    if (!timelineRegion) return;
    const maxScroll = Math.max(0, this.timelineLines.length - timelineRegion.height);
    this.scrollOffset = Math.min(maxScroll, Math.max(0, this.scrollOffset + delta));
  }

  public renderLayout(): VirtualScreen {
    this.screen.clear();

    const headerRegion = this.regionManager.getRegion('header')!;
    const timelineRegion = this.regionManager.getRegion('timeline')!;
    const inputRegion = this.regionManager.getRegion('input')!;
    const statusRegion = this.regionManager.getRegion('status')!;

    // 1. Render Fixed Header Top
    for (let i = 0; i < Math.min(this.headerContent.length, headerRegion.height); i++) {
      this.screen.writeString(headerRegion.x, headerRegion.y + i, this.headerContent[i]);
    }

    // 2. Render Scrollable Central Timeline
    const visibleLines = this.timelineLines.slice(
      this.scrollOffset,
      this.scrollOffset + timelineRegion.height
    );
    for (let i = 0; i < visibleLines.length; i++) {
      this.screen.writeString(timelineRegion.x, timelineRegion.y + i, visibleLines[i]);
    }

    // 3. Render Fixed Input Prompt (NEVER MOVES)
    const promptLine = `> ${this.inputContent}`;
    this.screen.writeString(inputRegion.x, inputRegion.y, promptLine);

    // 4. Render Fixed Status Bar Bottom
    this.screen.writeString(statusRegion.x, statusRegion.y, this.statusContent);

    // 5. Render Notification Overlay Banner (top-right overlay)
    if (this.notifications.length > 0) {
      const latest = this.notifications[this.notifications.length - 1];
      const toastText = `[ ${latest.type.toUpperCase()}: ${latest.message} ]`;
      const toastX = Math.max(0, this.screen.width - toastText.length - 1);
      this.screen.writeString(toastX, 0, toastText);
    }

    return this.screen;
  }

  public getInputCursorPosition(): { x: number; y: number } {
    const inputRegion = this.regionManager.getRegion('input')!;
    return {
      x: Math.min(this.screen.width - 1, 2 + this.inputContent.length),
      y: inputRegion.y,
    };
  }
}

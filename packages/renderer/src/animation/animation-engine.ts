export type AnimationCallback = (frameText: string) => void;

export class SpinnerAnimation {
  public static FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;

  public nextFrame(): string {
    const frame = SpinnerAnimation.FRAMES[this.currentFrame];
    this.currentFrame = (this.currentFrame + 1) % SpinnerAnimation.FRAMES.length;
    return frame;
  }
}

export class ProgressBarAnimation {
  public static renderProgress(percent: number, width = 20): string {
    const clamped = Math.min(100, Math.max(0, percent));
    const filledLength = Math.round((clamped / 100) * width);
    const emptyLength = width - filledLength;

    const filled = '━'.repeat(filledLength);
    const empty = '─'.repeat(emptyLength);

    return `[${filled}${empty}] ${clamped}%`;
  }
}

export class TypewriterAnimation {
  private fullText: string;
  private currentIndex = 0;

  constructor(fullText: string) {
    this.fullText = fullText;
  }

  public nextFrame(): string {
    if (this.currentIndex < this.fullText.length) {
      this.currentIndex++;
    }
    return this.fullText.slice(0, this.currentIndex);
  }

  public isComplete(): boolean {
    return this.currentIndex >= this.fullText.length;
  }
}

export class CursorPulseAnimation {
  private visible = true;

  public nextFrame(): string {
    this.visible = !this.visible;
    return this.visible ? '█' : ' ';
  }
}

export class AnimationEngine {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private callbacks: Set<AnimationCallback> = new Set();
  private running = false;

  constructor(intervalMs = 80) {
    this.intervalMs = intervalMs;
  }

  public registerCallback(callback: AnimationCallback): void {
    this.callbacks.add(callback);
    if (!this.running && this.callbacks.size > 0) {
      this.start();
    }
  }

  public unregisterCallback(callback: AnimationCallback): void {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public tick(): void {
    for (const cb of this.callbacks) {
      cb('');
    }
  }
}

import { colors } from './colors.js';

export class CLIProgressSpinner {
  private timer: NodeJS.Timeout | null = null;
  private message: string;
  private frameIndex = 0;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  constructor(message: string) {
    this.message = message;
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const frame = colors.brand(this.frames[this.frameIndex % this.frames.length]);
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex++;
    }, 80);
  }

  public stop(success = true, message?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const finalMsg = message || this.message;
    const symbol = success ? colors.symbolSuccess : colors.symbolError;
    process.stdout.write(`\r\x1b[K${symbol} ${finalMsg}\n`);
  }
}

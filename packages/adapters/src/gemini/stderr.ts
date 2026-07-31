export class GeminiStderrHandler {
  private buffer = '';
  private onErrorLineCallback?: (line: string) => void;

  public onErrorLine(callback: (line: string) => void): void {
    this.onErrorLineCallback = callback;
  }

  public handleData(chunk: Buffer | string): void {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split(/\r?\n|\r/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim().length > 0 && this.onErrorLineCallback) {
        this.onErrorLineCallback(line);
      }
    }
  }

  public getBufferedStderr(): string {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = '';
  }
}

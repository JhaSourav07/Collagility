import { GeminiOutputParser, type ParsedChunk } from './parser.js';

export class GeminiStdoutHandler {
  private buffer = '';
  private parser: GeminiOutputParser;
  private onParsedChunkCallback?: (chunk: ParsedChunk) => void;
  private onTurnCompleteCallback?: () => void;

  constructor(parser: GeminiOutputParser = new GeminiOutputParser()) {
    this.parser = parser;
  }

  public onChunk(callback: (chunk: ParsedChunk) => void): void {
    this.onParsedChunkCallback = callback;
  }

  public onTurnComplete(callback: () => void): void {
    this.onTurnCompleteCallback = callback;
  }

  public handleData(chunk: Buffer | string): void {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const parsed = this.parser.parseLine(line);
      if (this.onParsedChunkCallback) {
        this.onParsedChunkCallback(parsed);
      }
      if (parsed.type === 'completion') {
        this.notifyTurnComplete();
        return;
      }
    }
  }

  public flush(): void {
    if (this.buffer.length > 0) {
      const parsed = this.parser.parseLine(this.buffer);
      this.buffer = '';
      if (this.onParsedChunkCallback) {
        this.onParsedChunkCallback(parsed);
      }
    }
    this.parser.reset();
  }

  public notifyTurnComplete(): void {
    if (this.onTurnCompleteCallback) {
      this.onTurnCompleteCallback();
    }
  }

  public clear(): void {
    this.buffer = '';
    this.parser.reset();
  }
}

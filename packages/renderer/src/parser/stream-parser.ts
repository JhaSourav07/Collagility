import type { DocumentNode } from '../ast/nodes.js';
import { MarkdownParser } from './parser.js';

export class StreamMarkdownParser {
  private parser: MarkdownParser;
  private buffer: string;

  constructor() {
    this.parser = new MarkdownParser();
    this.buffer = '';
  }

  public appendChunk(chunk: string): DocumentNode {
    this.buffer += chunk;
    return this.parser.parse(this.buffer);
  }

  public getDocument(): DocumentNode {
    return this.parser.parse(this.buffer);
  }

  public reset(): void {
    this.buffer = '';
  }
}

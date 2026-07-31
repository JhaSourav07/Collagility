import { StreamChunk } from './chunk.js';

export interface CodeBlockSection {
  language: string;
  code: string;
  isComplete: boolean;
}

export class ChunkAssembler {
  private fullText = '';
  private currentLanguage = '';
  private isInCodeBlock = false;
  private codeBlocks: CodeBlockSection[] = [];

  public appendChunk(chunk: StreamChunk): string {
    const content = chunk.content;
    this.fullText += content;
    this.processMarkdownFences(content);
    return this.fullText;
  }

  public assemble(chunks: StreamChunk[]): string {
    this.reset();
    for (const chunk of chunks) {
      this.appendChunk(chunk);
    }
    return this.fullText;
  }

  private processMarkdownFences(chunkContent: string): void {
    const lines = chunkContent.split(/\r?\n/);
    for (const line of lines) {
      const fenceMatch = line.match(/^```(\w*)/);
      if (fenceMatch) {
        if (!this.isInCodeBlock) {
          this.isInCodeBlock = true;
          this.currentLanguage = fenceMatch[1] || 'plaintext';
          this.codeBlocks.push({
            language: this.currentLanguage,
            code: '',
            isComplete: false,
          });
        } else {
          this.isInCodeBlock = false;
          if (this.codeBlocks.length > 0) {
            this.codeBlocks[this.codeBlocks.length - 1].isComplete = true;
          }
          this.currentLanguage = '';
        }
      } else if (this.isInCodeBlock && this.codeBlocks.length > 0) {
        this.codeBlocks[this.codeBlocks.length - 1].code += line + '\n';
      }
    }
  }

  public getFullText(): string {
    return this.fullText;
  }

  public getCodeBlocks(): CodeBlockSection[] {
    return [...this.codeBlocks];
  }

  public isInsideCodeBlock(): boolean {
    return this.isInCodeBlock;
  }

  public reset(): void {
    this.fullText = '';
    this.currentLanguage = '';
    this.isInCodeBlock = false;
    this.codeBlocks = [];
  }
}

import { DocumentRenderer, type DocumentRendererOptions } from './document-renderer.js';
import { StreamMarkdownParser } from '../parser/stream-parser.js';

export class StreamDocumentRenderer {
  private streamParser: StreamMarkdownParser;
  private renderer: DocumentRenderer;

  constructor(options: DocumentRendererOptions = {}) {
    this.streamParser = new StreamMarkdownParser();
    this.renderer = new DocumentRenderer(options);
  }

  public appendChunk(chunk: string): string {
    const docAST = this.streamParser.appendChunk(chunk);
    return this.renderer.renderDocument(docAST);
  }

  public getRenderedOutput(): string {
    const docAST = this.streamParser.getDocument();
    return this.renderer.renderDocument(docAST);
  }

  public reset(): void {
    this.streamParser.reset();
  }
}

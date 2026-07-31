export interface ParsedChunk {
  type: 'text' | 'code' | 'warning' | 'error' | 'completion';
  content: string;
  language?: string;
}

export class GeminiOutputParser {
  private inCodeBlock = false;
  private currentLanguage = '';

  public parseLine(line: string): ParsedChunk {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!this.inCodeBlock) {
        this.inCodeBlock = true;
        this.currentLanguage = trimmed.slice(3).trim();
        return { type: 'code', content: line, language: this.currentLanguage };
      } else {
        this.inCodeBlock = false;
        const lang = this.currentLanguage;
        this.currentLanguage = '';
        return { type: 'code', content: line, language: lang };
      }
    }

    if (trimmed.includes('[GEMINI_COMPLETE]') || trimmed.includes('__GEMINI_DONE__')) {
      return { type: 'completion', content: line };
    }

    if (trimmed.startsWith('[ERROR]') || trimmed.startsWith('Error:')) {
      return { type: 'error', content: line };
    }

    if (trimmed.startsWith('[WARNING]') || trimmed.startsWith('Warning:')) {
      return { type: 'warning', content: line };
    }

    if (this.inCodeBlock) {
      return { type: 'code', content: line, language: this.currentLanguage };
    }

    return { type: 'text', content: line };
  }

  public reset(): void {
    this.inCodeBlock = false;
    this.currentLanguage = '';
  }
}

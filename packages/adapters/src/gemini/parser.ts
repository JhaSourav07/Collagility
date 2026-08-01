export interface ParsedChunk {
  type: 'text' | 'code' | 'warning' | 'error' | 'completion' | 'plan' | 'confirmation' | 'thinking' | 'question';
  content: string;
  language?: string;
  filePath?: string;
  options?: string[];
}

export class GeminiOutputParser {
  private inCodeBlock = false;
  private currentLanguage = '';

  public parseLine(line: string): ParsedChunk {
    const trimmed = line.trim();

    // Filter out agy's own internal banner/header lines (e.g. "🤖 AGY Stream Started: ...")
    const AGY_BANNER_PATTERNS = [
      /^🤖\s*AGY\s+Stream\s+(Started|Ended|Completed|Stopped)/i,
      /^AGY\s+Stream\s+(Started|Ended|Completed|Stopped)/i,
      /^🤖\s*AGI\s+Stream\s+(Started|Ended|Completed|Stopped)/i,
      /^Prompt:\s*"/i,
    ];
    if (AGY_BANNER_PATTERNS.some(p => p.test(trimmed))) {
      return { type: 'text', content: '' };
    }

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

    // Detect Thinking / Progress steps (e.g. "I will start by listing...", "● ListDir(...)")
    if (
      trimmed.startsWith('I will ') ||
      trimmed.startsWith('I am ') ||
      trimmed.startsWith('I have ') ||
      trimmed.startsWith('●') ||
      trimmed.startsWith('⎿')
    ) {
      return { type: 'thinking', content: line };
    }

    // Detect Plan Artifact Proposal
    if (
      (trimmed.toLowerCase().includes('implementation plan') ||
        trimmed.toLowerCase().includes('implementation_plan') ||
        trimmed.toLowerCase().includes('plan is available') ||
        trimmed.toLowerCase().includes('plan artifact')) &&
      (trimmed.includes('.md') || trimmed.includes('file://'))
    ) {
      const match = trimmed.match(/(?:file:\/\/)?(\/[^\s\)\n\]]+\.md)/) || trimmed.match(/(?:file:\/\/)?([^\s\(\)\*\[\]]+\.md)/);
      const rawPath = match ? match[1] : undefined;
      const filePath = rawPath ? rawPath.replace(/^.*?\((?:file:\/\/)?/, '').replace(/\)$/, '').replace(/^file:\/\//, '') : undefined;
      return { type: 'plan', content: line, filePath };
    }

    // Detect Interactive Questions & Confirmation Prompts
    if (
      trimmed.toLowerCase().includes('key open questions') ||
      trimmed.toLowerCase().includes('would you like') ||
      trimmed.toLowerCase().includes('shall we begin') ||
      trimmed.toLowerCase().includes('confirm [y/n]')
    ) {
      return {
        type: 'question',
        content: line,
        options: ['1. Proceed with defaults', '2. Modify plan', '3. Ask follow-up question'],
      };
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

export type InternalEventType = 'THOUGHT' | 'TOOL_CALL' | 'FILE_CHANGE' | 'ERROR';

export interface AntigravityParsedEvent {
  type: InternalEventType | 'TEXT' | 'COMPLETION';
  content: string;
  metadata?: {
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    filePath?: string;
    changeType?: 'created' | 'modified' | 'deleted';
    errorCode?: string;
    raw?: unknown;
  };
}

export class AntigravityOutputParser {
  private buffer = '';

  /**
   * Parse a single line from stdout or stderr.
   */
  public parseLine(line: string): AntigravityParsedEvent {
    const trimmed = line.trim();
    if (!trimmed) {
      return { type: 'TEXT', content: '' };
    }

    // 1. Try parsing JSON stream event (e.g. from agy --stream-json)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const json = JSON.parse(trimmed);
        const eventTypeStr = String(
          json.type || json.event || json.kind || json.action || json.status || ''
        ).toLowerCase();

        // THOUGHT
        if (
          eventTypeStr === 'thought' ||
          eventTypeStr === 'thinking' ||
          eventTypeStr === 'reasoning' ||
          eventTypeStr === 'thought_chunk' ||
          json.thought !== undefined ||
          json.thinking !== undefined
        ) {
          return {
            type: 'THOUGHT',
            content: json.content || json.thought || json.thinking || json.message || trimmed,
            metadata: { raw: json },
          };
        }

        // TOOL_CALL
        if (
          eventTypeStr === 'tool_call' ||
          eventTypeStr === 'tool_use' ||
          eventTypeStr === 'tool_request' ||
          eventTypeStr === 'tool_execution' ||
          eventTypeStr === 'tool' ||
          json.toolName ||
          json.tool_name ||
          json.tool
        ) {
          const toolName = json.toolName || json.tool_name || json.tool || 'unknown_tool';
          const toolArgs = json.toolArgs || json.args || json.input || json.parameters || {};
          return {
            type: 'TOOL_CALL',
            content: json.content || `Tool Call: ${toolName}`,
            metadata: { toolName, toolArgs, raw: json },
          };
        }

        // FILE_CHANGE
        if (
          eventTypeStr === 'file_change' ||
          eventTypeStr === 'file_edit' ||
          eventTypeStr === 'file_mutation' ||
          eventTypeStr === 'file_write' ||
          eventTypeStr === 'file_create' ||
          eventTypeStr === 'file_delete' ||
          json.filePath ||
          json.file_path ||
          json.file
        ) {
          const filePath = json.filePath || json.file_path || json.file || json.path;
          let changeType: 'created' | 'modified' | 'deleted' = 'modified';
          if (eventTypeStr.includes('create') || json.action === 'created') changeType = 'created';
          if (eventTypeStr.includes('delete') || json.action === 'deleted') changeType = 'deleted';

          return {
            type: 'FILE_CHANGE',
            content: json.content || `File Change [${changeType}]: ${filePath}`,
            metadata: { filePath, changeType, raw: json },
          };
        }

        // ERROR
        if (
          eventTypeStr === 'error' ||
          eventTypeStr === 'err' ||
          eventTypeStr === 'exception' ||
          eventTypeStr === 'failure' ||
          json.error !== undefined
        ) {
          const errorMsg = json.error || json.message || trimmed;
          const errorCode = json.errorCode || json.code || 'AGY_ERROR';
          return {
            type: 'ERROR',
            content: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
            metadata: { errorCode, raw: json },
          };
        }

        // COMPLETION
        if (eventTypeStr === 'completion' || eventTypeStr === 'done' || eventTypeStr === 'finished') {
          return {
            type: 'COMPLETION',
            content: json.content || json.message || trimmed,
            metadata: { raw: json },
          };
        }
      } catch {
        // Fall back to plain text parsing if JSON parse fails
      }
    }

    // 2. Plain Text / Stream Line parsing

    // THOUGHT patterns
    if (
      trimmed.startsWith('[THOUGHT]') ||
      trimmed.toLowerCase().startsWith('thought:') ||
      trimmed.toLowerCase().startsWith('thinking:') ||
      trimmed.startsWith('●') ||
      trimmed.startsWith('⎿') ||
      trimmed.startsWith('I will ') ||
      trimmed.startsWith('I am ') ||
      trimmed.startsWith('I have ') ||
      trimmed.startsWith('Analyzing ')
    ) {
      const content = trimmed.replace(/^\[THOUGHT\]\s*/i, '');
      return { type: 'THOUGHT', content };
    }

    // TOOL_CALL patterns
    if (
      trimmed.startsWith('[TOOL_CALL]') ||
      trimmed.toLowerCase().startsWith('tool call:') ||
      trimmed.toLowerCase().startsWith('calling tool:') ||
      trimmed.toLowerCase().startsWith('executing:') ||
      trimmed.toLowerCase().startsWith('executing command:') ||
      trimmed.toLowerCase().startsWith('executing command') ||
      trimmed.toLowerCase().startsWith('running tool:')
    ) {
      const toolMatch = trimmed.match(/(?:tool call|calling tool|executing command|executing|running tool|tool):\s*([a-zA-Z0-9_-]+)/i);
      const toolName = toolMatch ? toolMatch[1] : 'unknown_tool';
      return {
        type: 'TOOL_CALL',
        content: trimmed,
        metadata: { toolName },
      };
    }


    // FILE_CHANGE patterns
    if (
      trimmed.startsWith('[FILE_CHANGE]') ||
      trimmed.toLowerCase().startsWith('file changed:') ||
      trimmed.toLowerCase().startsWith('created file:') ||
      trimmed.toLowerCase().startsWith('modified file:') ||
      trimmed.toLowerCase().startsWith('deleted file:') ||
      trimmed.toLowerCase().startsWith('writing file:') ||
      trimmed.toLowerCase().startsWith('edited ')
    ) {
      const fileMatch = trimmed.match(/(?:file changed|created file|modified file|deleted file|writing file|edited file|file):\s*([^\s]+)/i);
      const filePath = fileMatch ? fileMatch[1] : undefined;
      let changeType: 'created' | 'modified' | 'deleted' = 'modified';
      if (trimmed.toLowerCase().includes('created')) changeType = 'created';
      if (trimmed.toLowerCase().includes('deleted')) changeType = 'deleted';

      return {
        type: 'FILE_CHANGE',
        content: trimmed,
        metadata: { filePath, changeType },
      };
    }

    // ERROR patterns
    if (
      trimmed.startsWith('[ERROR]') ||
      trimmed.startsWith('Error:') ||
      trimmed.startsWith('ERR:') ||
      trimmed.startsWith('Exception:')
    ) {
      return {
        type: 'ERROR',
        content: trimmed,
        metadata: { errorCode: 'AGY_ERROR' },
      };
    }

    if (trimmed.includes('[AGY_DONE]') || trimmed.includes('[AGY_COMPLETE]')) {
      return { type: 'COMPLETION', content: line };
    }

    return { type: 'TEXT', content: line };
  }

  /**
   * Parse a raw chunk of stream data (which may contain multiple lines).
   */
  public parseChunk(chunk: string): AntigravityParsedEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    const events: AntigravityParsedEvent[] = [];
    for (const line of lines) {
      if (line.trim()) {
        events.push(this.parseLine(line));
      }
    }
    return events;
  }

  public flush(): AntigravityParsedEvent[] {
    if (this.buffer.trim()) {
      const line = this.buffer;
      this.buffer = '';
      return [this.parseLine(line)];
    }
    return [];
  }

  public reset(): void {
    this.buffer = '';
  }
}

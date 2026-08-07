import { EventEmitter } from 'node:events';
import { AntigravityOutputParser } from '@collagility/adapters';

export interface HostStreamBroadcasterOptions {
  sessionId: string;
  onEmitStream: (payload: { sessionId: string; data: string; type: string; timestamp: number }) => void;
}

export class SessionHostBroadcaster extends EventEmitter {
  private parser: AntigravityOutputParser;
  private sessionId: string;
  private onEmitStream: (payload: { sessionId: string; data: string; type: string; timestamp: number }) => void;

  constructor(options: HostStreamBroadcasterOptions) {
    super();
    this.sessionId = options.sessionId;
    this.onEmitStream = options.onEmitStream;
    this.parser = new AntigravityOutputParser();

    this.parser.on('text_delta', (text: string) => {
      if (!text) return;
      this.onEmitStream({
        sessionId: this.sessionId,
        data: text,
        type: 'TEXT',
        timestamp: Date.now(),
      });
    });

    this.parser.on('thought', (thought: string) => {
      if (!thought) return;
      this.onEmitStream({
        sessionId: this.sessionId,
        data: thought.startsWith('>') ? thought : `> ${thought}`,
        type: 'THOUGHT',
        timestamp: Date.now(),
      });
    });

    this.parser.on('tool_use', (tool: { name: string; content?: string }) => {
      const label = tool.content || `• Executing: ${tool.name}`;
      this.onEmitStream({
        sessionId: this.sessionId,
        data: label,
        type: 'TOOL',
        timestamp: Date.now(),
      });
    });

    this.parser.on('step_complete', (content: string) => {
      this.onEmitStream({
        sessionId: this.sessionId,
        data: content || '✓ Task Completed',
        type: 'COMPLETION',
        timestamp: Date.now(),
      });
    });
  }

  public processStdout(rawChunk: string): void {
    if (!rawChunk) return;
    this.parser.parseChunk(rawChunk);
  }

  public destroy(): void {
    this.parser.reset();
  }
}

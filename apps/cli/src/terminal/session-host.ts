import { EventEmitter } from 'node:events';
import { AntigravityOutputParser } from '@collagility/adapters';

export interface StreamChunkPayload {
  id: string;
  type: 'TEXT' | 'TOOL' | 'FILE';
  content: string;
  timestamp: number;
}

export interface HostStreamBroadcasterOptions {
  sessionId: string;
  wsClient?: any;
  onEmitStream?: (payload: { sessionId: string; chunk: StreamChunkPayload; data: string; timestamp: number }) => void;
}

export class SessionHostBroadcaster extends EventEmitter {
  private parser: AntigravityOutputParser;
  private sessionId: string;
  private wsClient?: any;
  private onEmitStream?: (payload: { sessionId: string; chunk: StreamChunkPayload; data: string; timestamp: number }) => void;

  constructor(options: HostStreamBroadcasterOptions) {
    super();
    this.sessionId = options.sessionId;
    this.wsClient = options.wsClient;
    this.onEmitStream = options.onEmitStream;
    this.parser = new AntigravityOutputParser();

    this.parser.on('text_delta', (text: string) => {
      if (!text) return;
      this.emitChunk('TEXT', text);
    });

    this.parser.on('thought', (thought: string) => {
      if (!thought) return;
      const formatted = thought.startsWith('>') ? thought : `> ${thought}`;
      this.emitChunk('TEXT', formatted);
    });

    this.parser.on('tool_use', (tool: { name: string; content?: string }) => {
      const label = tool.content || `• Executing: ${tool.name}`;
      this.emitChunk('TOOL', label);
    });

    this.parser.on('step_complete', (content: string) => {
      this.emitChunk('TEXT', content || '✓ Task Completed');
    });
  }

  private emitChunk(type: 'TEXT' | 'TOOL' | 'FILE', content: string): void {
    const chunk: StreamChunkPayload = {
      id: `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      content,
      timestamp: Date.now(),
    };

    if (this.wsClient) {
      try {
        this.wsClient.send('session.stream.broadcast', {
          sessionId: this.sessionId,
          chunk,
          timestamp: Date.now(),
        });
      } catch {
        // Fail silently
      }
    }

    if (this.onEmitStream) {
      this.onEmitStream({
        sessionId: this.sessionId,
        chunk,
        data: content,
        timestamp: Date.now(),
      });
    }

    this.emit('broadcast', { sessionId: this.sessionId, chunk });
  }

  public processStdout(rawChunk: string): void {
    if (!rawChunk) return;
    this.parser.parseChunk(rawChunk);
  }

  public destroy(): void {
    this.parser.reset();
  }
}

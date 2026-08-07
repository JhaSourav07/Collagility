import { EventEmitter } from 'node:events';
import type { StreamChunk } from '@collagility/protocol';
import { PtyScreenBuffer } from './pty-screen-buffer.js';
import { appendAndTrimTerminalBuffer } from './buffer-utils.js';

export interface SessionClientStreamHandlerOptions {
  sessionId: string;
  wsClient?: any;
  onUpdateScreen?: (screenData: string) => void;
  onPtyUpdateScreen?: (ptyLines: string[]) => void;
}

export class SessionClientStreamHandler extends EventEmitter {
  private sessionId: string;
  private wsClient?: any;
  private onUpdateScreen?: (screenData: string) => void;
  private onPtyUpdateScreen?: (ptyLines: string[]) => void;
  private chunksMap: Map<string, StreamChunk> = new Map();
  private rawBuffer = '';
  private ptyBuffer: PtyScreenBuffer;

  constructor(options: SessionClientStreamHandlerOptions) {
    super();
    this.sessionId = options.sessionId;
    this.wsClient = options.wsClient;
    this.onUpdateScreen = options.onUpdateScreen;
    this.onPtyUpdateScreen = options.onPtyUpdateScreen;
    this.ptyBuffer = new PtyScreenBuffer();

    if (this.wsClient) {
      this.bindWsEvents();
    }
  }

  private bindWsEvents(): void {
    if (!this.wsClient) return;

    this.wsClient.on('session.stream.history', (payload: { sessionId: string; history: StreamChunk[] }) => {
      if (payload?.sessionId === this.sessionId && Array.isArray(payload.history)) {
        this.loadHistory(payload.history);
      }
    });

    this.wsClient.on('SESSION_STREAM_HISTORY', (payload: { sessionId: string; history: StreamChunk[] }) => {
      if (payload?.sessionId === this.sessionId && Array.isArray(payload.history)) {
        this.loadHistory(payload.history);
      }
    });

    this.wsClient.on('session.stream.broadcast', (payload: { sessionId: string; chunk: StreamChunk }) => {
      if (payload?.sessionId === this.sessionId && payload.chunk) {
        this.handleBroadcastChunk(payload.chunk);
      }
    });

    this.wsClient.on('SESSION_STREAM_BROADCAST', (payload: { sessionId: string; chunk: StreamChunk }) => {
      if (payload?.sessionId === this.sessionId && payload.chunk) {
        this.handleBroadcastChunk(payload.chunk);
      }
    });

    this.wsClient.on('terminal.screen.stream', (payload: { sessionId: string; data: string }) => {
      if (payload?.sessionId === this.sessionId && payload.data) {
        this.handleRawScreenData(payload.data);
      }
    });

    this.wsClient.on('terminal.pty.frame', (payload: { sessionId: string; data: string; cols?: number; rows?: number }) => {
      if (payload?.sessionId === this.sessionId && payload.data) {
        this.handlePtyFrameData(payload.data, payload.cols, payload.rows);
      }
    });

    this.wsClient.on('TERMINAL_PTY_FRAME', (payload: { sessionId: string; data: string; cols?: number; rows?: number }) => {
      if (payload?.sessionId === this.sessionId && payload.data) {
        this.handlePtyFrameData(payload.data, payload.cols, payload.rows);
      }
    });
  }

  public loadHistory(history: StreamChunk[]): void {
    for (const chunk of history) {
      if (chunk && chunk.id) {
        this.chunksMap.set(chunk.id, chunk);
      }
    }
    this.notifyUpdate();
  }

  public handleBroadcastChunk(chunk: StreamChunk): void {
    if (!chunk) return;
    const key = chunk.id || `chunk-${chunk.timestamp}-${Math.random()}`;
    if (!this.chunksMap.has(key)) {
      this.chunksMap.set(key, chunk);
      this.notifyUpdate();
    }
  }

  public handleRawScreenData(data: string): void {
    if (!data) return;
    this.rawBuffer = appendAndTrimTerminalBuffer(this.rawBuffer, data);
    this.notifyUpdate();
  }

  public handlePtyFrameData(data: string, cols?: number, rows?: number): void {
    if (!data) return;
    if (cols && rows) {
      this.ptyBuffer.resize(cols, rows);
    }
    this.ptyBuffer.write(data);
    const visibleLines = this.ptyBuffer.getVisibleLines();
    if (this.onPtyUpdateScreen) {
      this.onPtyUpdateScreen(visibleLines);
    }
    this.emit('pty_frame_update', visibleLines);
    this.notifyUpdate();
  }

  public getPtyScreenLines(): string[] {
    return this.ptyBuffer.getVisibleLines();
  }

  public hasPtyData(): boolean {
    return this.ptyBuffer.getVisibleLines().some((line) => line.trim().length > 0);
  }

  public getFormattedScreenData(): string {
    const chunks = Array.from(this.chunksMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const chunkText = chunks.map((c) => c.content).join('\n');

    if (chunkText && this.rawBuffer) {
      return `${chunkText}\n${this.rawBuffer}`;
    }
    return chunkText || this.rawBuffer;
  }

  private notifyUpdate(): void {
    const formatted = this.getFormattedScreenData();
    if (this.onUpdateScreen) {
      this.onUpdateScreen(formatted);
    }
    this.emit('screen_update', formatted);
  }

  public clear(): void {
    this.chunksMap.clear();
    this.rawBuffer = '';
    this.notifyUpdate();
  }
}

import { EventEmitter } from 'node:events';
import {
  createTerminalPtyFrameEvent,
  EVENT_TYPES,
  type TerminalPtyFramePayload,
  type EventEnvelope,
} from '@collagility/protocol';

export interface IPtyProcess {
  onData(listener: (data: string) => void): { dispose: () => void } | void;
  onExit(listener: (e: { exitCode: number; signal?: number }) => void): { dispose: () => void } | void;
  write?(data: string): void;
  resize?(cols: number, rows: number): void;
  kill?(signal?: string): void;
}

export type PtySpawnFunction = (
  file: string,
  args: string[] | string,
  options?: any
) => IPtyProcess;

export interface PtyTerminalHostOptions {
  sessionId: string;
  paneId?: string;
  wsClient?: any;
  onFrame?: (envelope: EventEnvelope<TerminalPtyFramePayload>) => void;
  spawnPtyFn?: PtySpawnFunction;
  flushIntervalMs?: number;
  maxChunkSizeBytes?: number;
  cols?: number;
  rows?: number;
}

export class ThrottledPtyStreamer {
  private buffer = '';
  private timer: NodeJS.Timeout | null = null;
  private seq = 0;
  private readonly flushIntervalMs: number;
  private readonly maxChunkSizeBytes: number;

  constructor(
    private readonly onFlush: (data: string, seq: number) => void,
    flushIntervalMs = 16,
    maxChunkSizeBytes = 16384
  ) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxChunkSizeBytes = maxChunkSizeBytes;
  }

  public push(chunk: string): void {
    if (typeof chunk !== 'string' || !chunk) return;
    this.buffer += chunk;
    if (this.buffer.length >= this.maxChunkSizeBytes) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const dataToEmit = this.buffer;
      const currentSeq = this.seq++;
      this.buffer = '';
      try {
        this.onFlush(dataToEmit, currentSeq);
      } catch {
        // Fail-safe flush error handling
      }
    }
  }

  public getSequenceNumber(): number {
    return this.seq;
  }

  public destroy(): void {
    this.flush();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export class PtyTerminalHost extends EventEmitter {
  private sessionId: string;
  private paneId: string;
  private wsClient?: any;
  private onFrame?: (envelope: EventEnvelope<TerminalPtyFramePayload>) => void;
  private spawnPtyFn?: PtySpawnFunction;
  private streamer: ThrottledPtyStreamer;
  private ptyProcess: IPtyProcess | null = null;
  private cols: number;
  private rows: number;

  constructor(options: PtyTerminalHostOptions) {
    super();
    this.sessionId = options.sessionId;
    this.paneId = options.paneId || 'main';
    this.wsClient = options.wsClient;
    this.onFrame = options.onFrame;
    this.spawnPtyFn = options.spawnPtyFn;
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;

    this.streamer = new ThrottledPtyStreamer(
      (data, seq) => this.broadcastFrame(data, seq),
      options.flushIntervalMs ?? 16,
      options.maxChunkSizeBytes ?? 16384
    );
  }

  private broadcastFrame(data: string, seq: number, isSnapshot = false): void {
    const payload: TerminalPtyFramePayload = {
      sessionId: this.sessionId,
      paneId: this.paneId,
      seq,
      encoding: 'utf8',
      data,
      isSnapshot,
      cols: this.cols,
      rows: this.rows,
      timestamp: Date.now(),
    };

    const envelope = createTerminalPtyFrameEvent(payload, this.sessionId);

    if (this.wsClient) {
      try {
        this.wsClient.send(EVENT_TYPES.TERMINAL_PTY_FRAME, payload);
      } catch {
        // Fail-safe
      }
    }

    if (this.onFrame) {
      this.onFrame(envelope);
    }

    this.emit('frame', envelope);
  }

  public startPtySession(file: string, args: string[] = [], options: any = {}): IPtyProcess {
    if (!this.spawnPtyFn) {
      throw new Error('PtyTerminalHost: No spawnPtyFn provided for PTY session');
    }

    this.ptyProcess = this.spawnPtyFn(file, args, {
      cols: this.cols,
      rows: this.rows,
      ...options,
    });

    if (this.ptyProcess.onData) {
      this.ptyProcess.onData((data: string) => {
        this.streamer.push(data);
      });
    }

    if (this.ptyProcess.onExit) {
      this.ptyProcess.onExit(() => {
        this.streamer.flush();
      });
    }

    return this.ptyProcess;
  }

  public writeRawData(data: string): void {
    this.streamer.push(data);
  }

  public flush(): void {
    this.streamer.flush();
  }

  public resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.ptyProcess?.resize) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  public destroy(): void {
    this.streamer.destroy();
    if (this.ptyProcess?.kill) {
      try {
        this.ptyProcess.kill();
      } catch {
        // Ignore kill errors
      }
    }
    this.ptyProcess = null;
  }
}

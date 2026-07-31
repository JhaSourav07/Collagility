import type { EventSender } from '@collagility/protocol';
import { createStreamChunk, StreamChunk } from './chunk.js';

export interface ChunkParserOptions {
  streamId: string;
  sessionId: string;
  sender: EventSender;
  adapterName?: string;
  startingSequence?: number;
}

export class ChunkParser {
  private streamId: string;
  private sessionId: string;
  private sender: EventSender;
  private adapterName?: string;
  private currentSequenceNumber: number;

  constructor(options: ChunkParserOptions) {
    this.streamId = options.streamId;
    this.sessionId = options.sessionId;
    this.sender = options.sender;
    this.adapterName = options.adapterName;
    this.currentSequenceNumber = options.startingSequence ?? 0;
  }

  public parseChunk(content: string, isFinal = false, metadata?: Record<string, unknown>): StreamChunk {
    const seq = this.currentSequenceNumber++;
    return createStreamChunk({
      streamId: this.streamId,
      sequenceNumber: seq,
      sessionId: this.sessionId,
      sender: this.sender,
      content,
      isFinal,
      adapterName: this.adapterName,
      metadata,
    });
  }

  public getNextSequenceNumber(): number {
    return this.currentSequenceNumber;
  }

  public resetSequence(startSeq = 0): void {
    this.currentSequenceNumber = startSeq;
  }
}

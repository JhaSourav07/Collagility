import { StreamChunk } from './chunk.js';

export interface StreamSnapshot {
  streamId: string;
  sessionId: string;
  assembledText: string;
  chunks: StreamChunk[];
  totalChunks: number;
  lastSequenceNumber: number;
  state: string;
}

export class ResponseBuffer {
  private chunksMap: Map<number, StreamChunk> = new Map();
  private streamId: string;
  private sessionId: string;
  private maxCapacity: number;

  constructor(streamId: string, sessionId: string, maxCapacity = 10000) {
    this.streamId = streamId;
    this.sessionId = sessionId;
    this.maxCapacity = maxCapacity;
  }

  public addChunk(chunk: StreamChunk): boolean {
    if (this.chunksMap.has(chunk.sequenceNumber)) {
      return false; // Duplicate
    }

    if (this.chunksMap.size >= this.maxCapacity) {
      // Evict oldest sequence number if capacity reached
      const lowestKey = Math.min(...this.chunksMap.keys());
      this.chunksMap.delete(lowestKey);
    }

    this.chunksMap.set(chunk.sequenceNumber, chunk);
    return true;
  }

  public getChunks(): StreamChunk[] {
    return Array.from(this.chunksMap.values()).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  public getAssembledText(): string {
    return this.getChunks()
      .map((c) => c.content)
      .join('');
  }

  public getSnapshot(currentState: string): StreamSnapshot {
    const orderedChunks = this.getChunks();
    const lastSeq = orderedChunks.length > 0 ? orderedChunks[orderedChunks.length - 1].sequenceNumber : -1;

    return {
      streamId: this.streamId,
      sessionId: this.sessionId,
      assembledText: this.getAssembledText(),
      chunks: orderedChunks,
      totalChunks: orderedChunks.length,
      lastSequenceNumber: lastSeq,
      state: currentState,
    };
  }

  public getChunkCount(): number {
    return this.chunksMap.size;
  }

  public hasChunk(sequenceNumber: number): boolean {
    return this.chunksMap.has(sequenceNumber);
  }

  public clear(): void {
    this.chunksMap.clear();
  }
}

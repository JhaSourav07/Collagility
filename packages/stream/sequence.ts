import { StreamChunk } from './chunk.js';

export interface ProcessedChunkResult {
  status: 'accepted' | 'reordered' | 'duplicate' | 'buffered';
  chunk?: StreamChunk;
  readyChunks: StreamChunk[];
  gapDetected?: boolean;
  missingSequences?: number[];
}

export class SequenceTracker {
  private expectedSequenceNumber: number;
  private seenSequences: Set<number> = new Set();
  private outOfOrderBuffer: Map<number, StreamChunk> = new Map();

  constructor(startingSequence = 0) {
    this.expectedSequenceNumber = startingSequence;
  }

  public processChunk(chunk: StreamChunk): ProcessedChunkResult {
    const seq = chunk.sequenceNumber;

    // Deduplication check
    if (this.seenSequences.has(seq)) {
      return {
        status: 'duplicate',
        readyChunks: [],
      };
    }

    this.seenSequences.add(seq);

    // In-order check
    if (seq === this.expectedSequenceNumber) {
      const readyChunks: StreamChunk[] = [chunk];
      this.expectedSequenceNumber++;

      // Drain out-of-order buffer if subsequent chunks are ready
      while (this.outOfOrderBuffer.has(this.expectedSequenceNumber)) {
        const nextChunk = this.outOfOrderBuffer.get(this.expectedSequenceNumber)!;
        this.outOfOrderBuffer.delete(this.expectedSequenceNumber);
        readyChunks.push(nextChunk);
        this.expectedSequenceNumber++;
      }

      return {
        status: readyChunks.length > 1 ? 'reordered' : 'accepted',
        chunk,
        readyChunks,
      };
    }

    // Future / out-of-order chunk: buffer it
    if (seq > this.expectedSequenceNumber) {
      this.outOfOrderBuffer.set(seq, chunk);

      const missingSequences: number[] = [];
      for (let s = this.expectedSequenceNumber; s < seq; s++) {
        if (!this.seenSequences.has(s)) {
          missingSequences.push(s);
        }
      }

      return {
        status: 'buffered',
        chunk,
        readyChunks: [],
        gapDetected: missingSequences.length > 0,
        missingSequences,
      };
    }

    // Older chunk that somehow slipped through deduplication check
    return {
      status: 'duplicate',
      readyChunks: [],
    };
  }

  public getExpectedSequenceNumber(): number {
    return this.expectedSequenceNumber;
  }

  public getBufferedCount(): number {
    return this.outOfOrderBuffer.size;
  }

  public reset(startSeq = 0): void {
    this.expectedSequenceNumber = startSeq;
    this.seenSequences.clear();
    this.outOfOrderBuffer.clear();
  }
}

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import type { EventSender, EventEnvelope } from '@collagility/protocol';
import {
  createAIStreamStartedEvent,
  createAIStreamChunkEvent,
  createAIStreamProgressEvent,
  createAIStreamCompletedEvent,
  createAIStreamCancelledEvent,
  createAIStreamFailedEvent,
  createAIStreamTimeoutEvent,
  createAIStreamErrorEvent,
} from '@collagility/protocol';

import { StreamChunk, validateStreamChunk } from './chunk.js';
import { ChunkParser } from './chunk-parser.js';
import { ResponseBuffer, StreamSnapshot } from './chunk-buffer.js';
import { SequenceTracker } from './sequence.js';
import { ChunkAssembler } from './assembler.js';
import { CancellationManager } from './cancellation.js';
import { StreamStateMachine, StreamState } from './state.js';

export interface ActiveSessionStream {
  streamId: string;
  sessionId: string;
  ownerId: string;
  adapterName: string;
  stateMachine: StreamStateMachine;
  sequenceTracker: SequenceTracker;
  responseBuffer: ResponseBuffer;
  assembler: ChunkAssembler;
  parser: ChunkParser;
  startedAt: number;
  timeoutTimer?: NodeJS.Timeout;
}

export interface StreamManagerOptions {
  streamTimeoutMs?: number;
}

export class StreamManager extends EventEmitter {
  private activeStreamsBySession: Map<string, ActiveSessionStream> = new Map();
  private cancellationManager: CancellationManager = new CancellationManager();
  private streamTimeoutMs: number;

  constructor(options: StreamManagerOptions = {}) {
    super();
    this.streamTimeoutMs = options.streamTimeoutMs ?? 60000; // default 60s timeout
  }

  public startStream(params: {
    sessionId: string;
    ownerId: string;
    prompt: string;
    adapterName: string;
    streamId?: string;
  }): ActiveSessionStream {
    const { sessionId, ownerId, prompt, adapterName } = params;

    // Core Principle Enforcement: ONE AI stream per session
    const existing = this.activeStreamsBySession.get(sessionId);
    if (existing && !existing.stateMachine.isTerminal()) {
      const errorMsg = `Session '${sessionId}' already has an active AI stream (${existing.streamId})`;
      this.emit('streamEvent', createAIStreamErrorEvent({ error: errorMsg, code: 'STREAM_ALREADY_ACTIVE' }, sessionId));
      throw new Error(errorMsg);
    }

    const streamId = params.streamId || `stream-${crypto.randomUUID()}`;
    const stateMachine = new StreamStateMachine(streamId, 'Preparing');
    const sequenceTracker = new SequenceTracker(0);
    const responseBuffer = new ResponseBuffer(streamId, sessionId);
    const assembler = new ChunkAssembler();
    const sender: EventSender = { id: adapterName, name: adapterName, role: 'ai' };
    const parser = new ChunkParser({ streamId, sessionId, sender, adapterName });

    const activeStream: ActiveSessionStream = {
      streamId,
      sessionId,
      ownerId,
      adapterName,
      stateMachine,
      sequenceTracker,
      responseBuffer,
      assembler,
      parser,
      startedAt: Date.now(),
    };

    // Set timeout timer
    activeStream.timeoutTimer = setTimeout(() => {
      this.handleTimeout(sessionId);
    }, this.streamTimeoutMs);

    this.activeStreamsBySession.set(sessionId, activeStream);
    stateMachine.transitionTo('Streaming');

    // Create & emit stream.started event
    const startedEvent = createAIStreamStartedEvent(
      {
        streamId,
        adapterName,
        prompt,
        ownerId,
        startedAt: activeStream.startedAt,
        initialState: 'Streaming',
      },
      sessionId
    );

    this.emit('streamEvent', startedEvent);
    return activeStream;
  }

  public handleRawChunk(
    sessionId: string,
    rawContent: string,
    isFinal = false,
    metadata?: Record<string, unknown>
  ): EventEnvelope<unknown>[] {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream || activeStream.stateMachine.getState() !== 'Streaming') {
      return [];
    }

    const chunk = activeStream.parser.parseChunk(rawContent, isFinal, metadata);
    return this.handleChunk(sessionId, chunk);
  }

  public handleChunk(sessionId: string, chunk: StreamChunk): EventEnvelope<unknown>[] {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream) {
      return [];
    }

    if (!validateStreamChunk(chunk)) {
      this.emit('log', { level: 'warn', message: 'Received malformed stream chunk', chunk });
      return [];
    }

    const result = activeStream.sequenceTracker.processChunk(chunk);
    const generatedEvents: EventEnvelope<unknown>[] = [];

    if (result.status === 'duplicate') {
      this.emit('log', { level: 'debug', message: `Duplicate chunk dropped: seq ${chunk.sequenceNumber}` });
      return [];
    }

    for (const readyChunk of result.readyChunks) {
      activeStream.responseBuffer.addChunk(readyChunk);
      activeStream.assembler.appendChunk(readyChunk);

      const chunkEvent = createAIStreamChunkEvent(
        {
          streamId: readyChunk.streamId,
          sequenceNumber: readyChunk.sequenceNumber,
          timestamp: readyChunk.timestamp,
          sender: readyChunk.sender,
          sessionId: readyChunk.sessionId,
          content: readyChunk.content,
          isFinal: readyChunk.isFinal,
          adapterName: activeStream.adapterName,
          metadata: readyChunk.metadata,
        },
        sessionId
      );

      generatedEvents.push(chunkEvent);
      this.emit('streamEvent', chunkEvent);
    }

    if (result.readyChunks.some((c) => c.isFinal)) {
      this.completeStream(sessionId);
    }

    return generatedEvents;
  }

  public cancelStream(sessionId: string, requestedBy: string, reason = 'Cancelled by owner'): boolean {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream || activeStream.stateMachine.isTerminal()) {
      return false;
    }

    if (activeStream.timeoutTimer) {
      clearTimeout(activeStream.timeoutTimer);
    }

    activeStream.stateMachine.transitionTo('Cancelling', reason);
    this.cancellationManager.cancel(activeStream.streamId, requestedBy, reason);

    const cancelledEvent = createAIStreamCancelledEvent(
      {
        streamId: activeStream.streamId,
        adapterName: activeStream.adapterName,
        reason,
        cancelledAt: Date.now(),
      },
      sessionId
    );

    this.emit('streamEvent', cancelledEvent);
    activeStream.stateMachine.transitionTo('Idle');
    activeStream.responseBuffer.clear();
    this.activeStreamsBySession.delete(sessionId);

    return true;
  }

  public completeStream(sessionId: string): void {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream || activeStream.stateMachine.isTerminal()) {
      return;
    }

    if (activeStream.timeoutTimer) {
      clearTimeout(activeStream.timeoutTimer);
    }

    activeStream.stateMachine.transitionTo('Completed');
    console.log('[Lifecycle] Completed');
    console.log('[Lifecycle] Cleanup Started');
    console.log('[Lifecycle] Removing Active Stream');
    console.log('[Lifecycle] Removing Buffer');

    const durationMs = Date.now() - activeStream.startedAt;
    const completedEvent = createAIStreamCompletedEvent(
      {
        streamId: activeStream.streamId,
        adapterName: activeStream.adapterName,
        totalChunks: activeStream.responseBuffer.getChunkCount(),
        fullResponse: activeStream.assembler.getFullText(),
        durationMs,
      },
      sessionId
    );

    this.emit('streamEvent', completedEvent);
    activeStream.stateMachine.transitionTo('Idle');
    console.log('[Lifecycle] State -> Idle');
    console.log('[Lifecycle] Cleanup Finished');
    activeStream.responseBuffer.clear();
    this.activeStreamsBySession.delete(sessionId);
  }

  public failStream(sessionId: string, error: string, code?: string): void {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream) {
      return;
    }

    if (activeStream.timeoutTimer) {
      clearTimeout(activeStream.timeoutTimer);
    }

    activeStream.stateMachine.transitionTo('Failed', error);

    const failedEvent = createAIStreamFailedEvent(
      {
        streamId: activeStream.streamId,
        adapterName: activeStream.adapterName,
        error,
        code,
        failedAt: Date.now(),
      },
      sessionId
    );

    this.emit('streamEvent', failedEvent);
    activeStream.stateMachine.transitionTo('Idle');
    activeStream.responseBuffer.clear();
    this.activeStreamsBySession.delete(sessionId);
  }

  public handleTimeout(sessionId: string): void {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream || activeStream.stateMachine.isTerminal()) {
      return;
    }

    activeStream.stateMachine.transitionTo('Timeout');

    const timeoutEvent = createAIStreamTimeoutEvent(
      {
        streamId: activeStream.streamId,
        adapterName: activeStream.adapterName,
        timeoutMs: this.streamTimeoutMs,
      },
      sessionId
    );

    this.emit('streamEvent', timeoutEvent);
    activeStream.stateMachine.transitionTo('Idle');
    activeStream.responseBuffer.clear();
    this.activeStreamsBySession.delete(sessionId);
  }

  public getLateJoinerState(sessionId: string): StreamSnapshot | null {
    const activeStream = this.activeStreamsBySession.get(sessionId);
    if (!activeStream) {
      return null;
    }
    return activeStream.responseBuffer.getSnapshot(activeStream.stateMachine.getState());
  }

  public getActiveStream(sessionId: string): ActiveSessionStream | undefined {
    return this.activeStreamsBySession.get(sessionId);
  }

  public isStreamActive(sessionId: string): boolean {
    const active = this.activeStreamsBySession.get(sessionId);
    return !!active && !active.stateMachine.isTerminal();
  }
}

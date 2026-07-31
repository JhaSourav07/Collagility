import type { EventSender } from '@collagility/protocol';

export interface StreamChunk {
  streamId: string;
  sequenceNumber: number;
  timestamp: number;
  sender: EventSender;
  sessionId: string;
  content: string;
  isFinal: boolean;
  adapterName?: string;
  metadata?: Record<string, unknown>;
}

export function validateStreamChunk(chunk: unknown): chunk is StreamChunk {
  if (typeof chunk !== 'object' || chunk === null) {
    return false;
  }

  const c = chunk as Record<string, unknown>;

  if (typeof c.streamId !== 'string' || !c.streamId) return false;
  if (typeof c.sequenceNumber !== 'number' || c.sequenceNumber < 0) return false;
  if (typeof c.timestamp !== 'number') return false;
  if (typeof c.sessionId !== 'string' || !c.sessionId) return false;
  if (typeof c.content !== 'string') return false;
  if (typeof c.isFinal !== 'boolean') return false;
  if (typeof c.sender !== 'object' || c.sender === null) return false;

  const sender = c.sender as Record<string, unknown>;
  if (typeof sender.id !== 'string' || !sender.id) return false;

  return true;
}

export function createStreamChunk(
  params: {
    streamId: string;
    sequenceNumber: number;
    sessionId: string;
    sender: EventSender;
    content: string;
    isFinal?: boolean;
    adapterName?: string;
    metadata?: Record<string, unknown>;
    timestamp?: number;
  }
): StreamChunk {
  return {
    streamId: params.streamId,
    sequenceNumber: params.sequenceNumber,
    timestamp: params.timestamp ?? Date.now(),
    sender: params.sender,
    sessionId: params.sessionId,
    content: params.content,
    isFinal: params.isFinal ?? false,
    ...(params.adapterName ? { adapterName: params.adapterName } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };
}

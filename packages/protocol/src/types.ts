export interface EventSender {
  id: string;
  name?: string;
  role?: 'owner' | 'member' | 'system' | 'ai';
}

export interface EventEnvelope<T = unknown> {
  version: number;
  id: string;
  timestamp: number;
  seq?: number;
  sessionId?: string;
  sender?: EventSender;
  type: string;
  payload: T;
}

export type BaseEnvelope<T = unknown> = EventEnvelope<T>;

export interface ChatMessagePayload {
  text: string;
  format?: 'plain' | 'markdown';
}

export interface ChatSystemPayload {
  message: string;
  level?: 'info' | 'warn' | 'error';
}

export interface ErrorPayload {
  error: string;
  code?: string;
  details?: unknown;
}

// AI Event Payloads (Milestone 6)
export interface AIPromptPayload {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AIStatusPayload {
  adapterName: string;
  status: 'uninitialized' | 'initializing' | 'ready' | 'processing' | 'cancelled' | 'failed' | 'stopped';
  message?: string;
}

export interface AICompletedPayload {
  adapterName: string;
  response: string;
  metadata?: Record<string, unknown>;
}

export interface AIFAILEDPayload {
  adapterName: string;
  error: string;
  code?: string;
}

export interface AICancelledPayload {
  adapterName: string;
  reason?: string;
}

export interface AIChunkPayload {
  adapterName: string;
  messageId: string;
  chunkIndex: number;
  content: string;
  isFinal: boolean;
}

// AI Stream Event Payloads (Milestone 8)
export interface AIStreamStartedPayload {
  streamId: string;
  adapterName: string;
  prompt: string;
  ownerId: string;
  startedAt: number;
  initialState?: string;
}

export interface AIStreamChunkPayload {
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

export interface AIStreamProgressPayload {
  streamId: string;
  sequenceNumber: number;
  totalChunks: number;
  bufferedBytes: number;
  elapsedMs: number;
}

export interface AIStreamCompletedPayload {
  streamId: string;
  adapterName: string;
  totalChunks: number;
  fullResponse: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface AIStreamCancelledPayload {
  streamId: string;
  adapterName: string;
  reason?: string;
  cancelledAt: number;
}

export interface AIStreamFailedPayload {
  streamId: string;
  adapterName: string;
  error: string;
  code?: string;
  failedAt: number;
}

export interface AIStreamTimeoutPayload {
  streamId: string;
  adapterName: string;
  timeoutMs: number;
}

export interface AIStreamErrorPayload {
  streamId?: string;
  adapterName?: string;
  error: string;
  code?: string;
}

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

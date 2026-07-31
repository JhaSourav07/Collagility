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

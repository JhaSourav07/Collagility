import crypto from 'node:crypto';
import { CURRENT_PROTOCOL_VERSION, EVENT_TYPES } from './constants.js';
import type {
  EventEnvelope,
  EventSender,
  ChatMessagePayload,
  ChatSystemPayload,
  ErrorPayload,
  AIPromptPayload,
  AIStatusPayload,
  AICompletedPayload,
  AIFAILEDPayload,
  AICancelledPayload,
  AIChunkPayload,
  AIStreamStartedPayload,
  AIStreamChunkPayload,
  AIStreamProgressPayload,
  AIStreamCompletedPayload,
  AIStreamCancelledPayload,
  AIStreamFailedPayload,
  AIStreamTimeoutPayload,
  AIStreamErrorPayload,
} from './types.js';

export function createEnvelope<T>(
  type: string,
  payload: T,
  options: {
    sessionId?: string;
    sender?: EventSender;
    seq?: number;
  } = {}
): EventEnvelope<T> {
  return {
    version: CURRENT_PROTOCOL_VERSION,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    payload,
    ...(options.sessionId ? { sessionId: options.sessionId } : {}),
    ...(options.sender ? { sender: options.sender } : {}),
    ...(typeof options.seq === 'number' ? { seq: options.seq } : {}),
  };
}

export function createChatMessageEvent(
  sender: EventSender,
  text: string,
  sessionId?: string,
  seq?: number
): EventEnvelope<ChatMessagePayload> {
  return createEnvelope(EVENT_TYPES.CHAT_MESSAGE, { text, format: 'plain' }, { sender, sessionId, seq });
}

export function createChatSystemEvent(
  message: string,
  sessionId?: string,
  level: 'info' | 'warn' | 'error' = 'info'
): EventEnvelope<ChatSystemPayload> {
  return createEnvelope(
    EVENT_TYPES.CHAT_SYSTEM,
    { message, level },
    { sender: { id: 'system', name: 'System', role: 'system' }, sessionId }
  );
}

export function createErrorEvent(error: string, code?: string, sessionId?: string): EventEnvelope<ErrorPayload> {
  return createEnvelope(EVENT_TYPES.ERROR, { error, code }, { sessionId });
}

// AI Event Factories (Milestone 6)
export function createAIStartedEvent(adapterName: string, sessionId?: string): EventEnvelope<AIStatusPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_STARTED,
    { adapterName, status: 'initializing' },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

export function createAIReadyEvent(adapterName: string, sessionId?: string): EventEnvelope<AIStatusPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_READY,
    { adapterName, status: 'ready' },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

export function createAIPromptEvent(
  prompt: string,
  context?: Record<string, unknown>,
  sessionId?: string
): EventEnvelope<AIPromptPayload> {
  return createEnvelope(EVENT_TYPES.AI_PROMPT, { prompt, context }, { sessionId });
}

export function createAICompletedEvent(
  adapterName: string,
  response: string,
  metadata?: Record<string, unknown>,
  sessionId?: string
): EventEnvelope<AICompletedPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_COMPLETED,
    { adapterName, response, metadata },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

export function createAIFailedEvent(
  adapterName: string,
  error: string,
  code?: string,
  sessionId?: string
): EventEnvelope<AIFAILEDPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_FAILED,
    { adapterName, error, code },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

export function createAICancelledEvent(
  adapterName: string,
  reason?: string,
  sessionId?: string
): EventEnvelope<AICancelledPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_CANCELLED,
    { adapterName, reason },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

export function createAIChunkEvent(
  adapterName: string,
  messageId: string,
  chunkIndex: number,
  content: string,
  isFinal: boolean,
  sessionId?: string
): EventEnvelope<AIChunkPayload> {
  return createEnvelope(
    EVENT_TYPES.AI_CHUNK,
    { adapterName, messageId, chunkIndex, content, isFinal },
    { sender: { id: adapterName, name: adapterName, role: 'ai' }, sessionId }
  );
}

// AI Stream Event Factories (Milestone 8)
export function createAIStreamStartedEvent(
  payload: AIStreamStartedPayload,
  sessionId?: string
): EventEnvelope<AIStreamStartedPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_STARTED, payload, {
    sessionId: sessionId || payload.streamId,
    sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
  });
}

export function createAIStreamChunkEvent(
  payload: AIStreamChunkPayload,
  sessionId?: string
): EventEnvelope<AIStreamChunkPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_CHUNK, payload, {
    sessionId: sessionId || payload.sessionId,
    sender: payload.sender,
    seq: payload.sequenceNumber,
  });
}

export function createAIStreamProgressEvent(
  payload: AIStreamProgressPayload,
  sessionId?: string
): EventEnvelope<AIStreamProgressPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_PROGRESS, payload, { sessionId });
}

export function createAIStreamCompletedEvent(
  payload: AIStreamCompletedPayload,
  sessionId?: string
): EventEnvelope<AIStreamCompletedPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_COMPLETED, payload, {
    sessionId,
    sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
  });
}

export function createAIStreamCancelledEvent(
  payload: AIStreamCancelledPayload,
  sessionId?: string
): EventEnvelope<AIStreamCancelledPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_CANCELLED, payload, {
    sessionId,
    sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
  });
}

export function createAIStreamFailedEvent(
  payload: AIStreamFailedPayload,
  sessionId?: string
): EventEnvelope<AIStreamFailedPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_FAILED, payload, {
    sessionId,
    sender: { id: payload.adapterName, name: payload.adapterName, role: 'ai' },
  });
}

export function createAIStreamTimeoutEvent(
  payload: AIStreamTimeoutPayload,
  sessionId?: string
): EventEnvelope<AIStreamTimeoutPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_TIMEOUT, payload, { sessionId });
}

export function createAIStreamErrorEvent(
  payload: AIStreamErrorPayload,
  sessionId?: string
): EventEnvelope<AIStreamErrorPayload> {
  return createEnvelope(EVENT_TYPES.AI_STREAM_ERROR, payload, { sessionId });
}

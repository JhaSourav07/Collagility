import crypto from 'node:crypto';
import { CURRENT_PROTOCOL_VERSION, EVENT_TYPES } from './constants.js';
import type { EventEnvelope, EventSender, ChatMessagePayload, ChatSystemPayload, ErrorPayload } from './types.js';

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

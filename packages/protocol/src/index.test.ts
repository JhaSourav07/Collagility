import { describe, it, expect } from 'vitest';
import {
  createChatMessageEvent,
  createChatSystemEvent,
  createTerminalScreenStreamEvent,
  isTerminalScreenStreamPayload,
  parseEnvelope,
  serializeEnvelope,
  validateEnvelope,
  CURRENT_PROTOCOL_VERSION,
  EVENT_TYPES,
} from './index.js';

describe('@collagility/protocol', () => {
  it('should create and validate a versioned Chat Message envelope', () => {
    const sender = { id: 'user-1', name: 'Sourav', role: 'owner' as const };
    const event = createChatMessageEvent(sender, 'Hello Collagility!', 'blue-hawk-1234', 1);

    expect(event.version).toBe(CURRENT_PROTOCOL_VERSION);
    expect(event.type).toBe(EVENT_TYPES.CHAT_MESSAGE);
    expect(event.sessionId).toBe('blue-hawk-1234');
    expect(event.seq).toBe(1);
    expect(event.sender).toEqual(sender);
    expect(event.payload.text).toBe('Hello Collagility!');

    const serialized = serializeEnvelope(event);
    const parsed = parseEnvelope(serialized);

    expect(parsed.success).toBe(true);
    expect(parsed.envelope).toEqual(event);
  });

  it('should reject malformed packets', () => {
    const invalidJson = parseEnvelope('{ invalid json }');
    expect(invalidJson.success).toBe(false);
    expect(invalidJson.error).toBe('Invalid JSON string');

    const invalidEnvelope = validateEnvelope({ version: 1 });
    expect(invalidEnvelope.success).toBe(false);
    expect(invalidEnvelope.error).toContain('Invalid envelope schema');
  });

  it('should create a system event', () => {
    const sysEvent = createChatSystemEvent('Emma joined the session', 'blue-hawk-1234');
    expect(sysEvent.type).toBe(EVENT_TYPES.CHAT_SYSTEM);
    expect(sysEvent.sender?.role).toBe('system');
    expect(sysEvent.payload.message).toBe('Emma joined the session');
  });

  it('should create and validate TERMINAL_SCREEN_STREAM event envelope and payload', () => {
    const payload = {
      sessionId: 'sess-100',
      senderId: 'host-1',
      pane: 'right' as const,
      data: '\x1b[31mHello ANSI\x1b[0m',
      cols: 120,
      rows: 40,
      timestamp: Date.now(),
    };
    const streamEvent = createTerminalScreenStreamEvent(payload);

    expect(streamEvent.type).toBe(EVENT_TYPES.TERMINAL_SCREEN_STREAM);
    expect(streamEvent.sessionId).toBe('sess-100');
    expect(streamEvent.payload).toEqual(payload);

    const serialized = serializeEnvelope(streamEvent);
    const parsed = parseEnvelope(serialized);
    expect(parsed.success).toBe(true);
    expect(isTerminalScreenStreamPayload(parsed.envelope?.payload)).toBe(true);
  });
});

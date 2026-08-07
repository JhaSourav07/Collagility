import { describe, it, expect } from 'vitest';
import {
  createTerminalPtyFrameEvent,
  isTerminalPtyFramePayload,
  validateTerminalPtyFramePayload,
  TerminalPtyFramePayloadSchema,
  parseEnvelope,
  serializeEnvelope,
  CURRENT_PROTOCOL_VERSION,
  EVENT_TYPES,
} from './index.js';

describe('Terminal PTY Frame Protocol Schema & Validation', () => {
  it('should parse valid TerminalPtyFrame payloads with default values', () => {
    const rawPayload = {
      sessionId: 'sess-pty-100',
      seq: 0,
      data: 'Hello PTY',
      timestamp: 1786128000000,
    };

    const parsed = TerminalPtyFramePayloadSchema.safeParse(rawPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sessionId).toBe('sess-pty-100');
      expect(parsed.data.paneId).toBe('main');
      expect(parsed.data.seq).toBe(0);
      expect(parsed.data.encoding).toBe('utf8');
      expect(parsed.data.data).toBe('Hello PTY');
      expect(parsed.data.isSnapshot).toBe(false);
      expect(parsed.data.timestamp).toBe(1786128000000);
    }
  });

  it('should parse valid full TerminalPtyFrame payloads with custom options', () => {
    const fullPayload = {
      sessionId: 'sess-pty-200',
      paneId: 'right-pane',
      seq: 42,
      encoding: 'base64' as const,
      data: 'SGVsbG8gQ29sbGFnaWxpdHkgUFRZ',
      isSnapshot: true,
      cols: 120,
      rows: 40,
      timestamp: 1786128000000,
    };

    const validation = validateTerminalPtyFramePayload(fullPayload);
    expect(validation.success).toBe(true);
    expect(validation.data).toEqual(fullPayload);
    expect(isTerminalPtyFramePayload(fullPayload)).toBe(true);
  });

  it('should reject invalid payloads with clear error messages', () => {
    // Missing sessionId
    const noSessionId = validateTerminalPtyFramePayload({
      seq: 1,
      data: 'test',
      timestamp: Date.now(),
    });
    expect(noSessionId.success).toBe(false);
    expect(noSessionId.error).toContain('sessionId: Required');

    // Invalid sequence number type
    const invalidSeq = validateTerminalPtyFramePayload({
      sessionId: 'sess-1',
      seq: 'not-a-number',
      data: 'test',
      timestamp: Date.now(),
    });
    expect(invalidSeq.success).toBe(false);
    expect(invalidSeq.error).toContain('seq: Expected number');

    // Invalid encoding enum
    const invalidEncoding = validateTerminalPtyFramePayload({
      sessionId: 'sess-1',
      seq: 1,
      encoding: 'utf16',
      data: 'test',
      timestamp: Date.now(),
    });
    expect(invalidEncoding.success).toBe(false);
    expect(invalidEncoding.error).toContain('encoding: Invalid enum value');

    // Non-object payload
    expect(isTerminalPtyFramePayload(null)).toBe(false);
    expect(isTerminalPtyFramePayload('string-payload')).toBe(false);
  });

  it('should perform lossless encode/decode round-trip for ANSI escape sequences and multi-byte UTF-8', () => {
    const ansiAndUtf8String =
      '\x1b[2J\x1b[H\x1b[32m[COLLAGILITY LIVE PTY]\x1b[0m ⚡ 🟢 📁 🔍 🤖 🚀\r\n' +
      '\x1b[1;34mUnicode Test:\x1b[0m こんにちは, 世界！ Ångström ∑ ∏ ∫ ≈ ≠ ⩽ ⩾\r\n' +
      '\x1b[K\x1b[33mProgress: [████████████████████] 100%\x1b[0m\r\n';

    const ptyPayload = {
      sessionId: 'sess-utf8-ansi-999',
      paneId: 'main',
      seq: 1500,
      encoding: 'utf8' as const,
      data: ansiAndUtf8String,
      isSnapshot: false,
      cols: 80,
      rows: 24,
      timestamp: 1786128005000,
    };

    const eventEnvelope = createTerminalPtyFrameEvent(ptyPayload);

    expect(eventEnvelope.version).toBe(CURRENT_PROTOCOL_VERSION);
    expect(eventEnvelope.type).toBe(EVENT_TYPES.TERMINAL_PTY_FRAME);
    expect(eventEnvelope.sessionId).toBe('sess-utf8-ansi-999');
    expect(eventEnvelope.seq).toBe(1500);

    const serialized = serializeEnvelope(eventEnvelope);
    const parsedResult = parseEnvelope<typeof ptyPayload>(serialized);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.envelope?.payload).toEqual(ptyPayload);
    expect(parsedResult.envelope?.payload.data).toBe(ansiAndUtf8String);

    // Verify byte-level equality for ANSI control codes and multi-byte UTF-8 string
    expect(Buffer.from(parsedResult.envelope?.payload.data || '')).toEqual(Buffer.from(ansiAndUtf8String));
  });
});

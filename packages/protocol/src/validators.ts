import { BaseEnvelopeSchema, TerminalScreenStreamPayloadSchema, TerminalPtyFramePayloadSchema } from './schemas.js';
import type { EventEnvelope, TerminalScreenStreamPayload, TerminalPtyFramePayload } from './types.js';

export interface ValidationResult<T = unknown> {
  success: boolean;
  envelope?: EventEnvelope<T>;
  error?: string;
}

export function validateEnvelope<T = unknown>(raw: unknown): ValidationResult<T> {
  if (typeof raw !== 'object' || raw === null) {
    return { success: false, error: 'Packet must be a non-null object' };
  }

  const result = BaseEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid envelope schema: ${formatted}` };
  }

  return { success: true, envelope: result.data as EventEnvelope<T> };
}

export function parseEnvelope<T = unknown>(jsonString: string): ValidationResult<T> {
  try {
    const parsed = JSON.parse(jsonString);
    return validateEnvelope<T>(parsed);
  } catch (err) {
    return { success: false, error: 'Invalid JSON string' };
  }
}

export function serializeEnvelope(envelope: EventEnvelope): string {
  return JSON.stringify(envelope);
}

export function isTerminalScreenStreamPayload(raw: unknown): raw is TerminalScreenStreamPayload {
  return TerminalScreenStreamPayloadSchema.safeParse(raw).success;
}

export function validateTerminalScreenStreamPayload(raw: unknown): { success: boolean; data?: TerminalScreenStreamPayload; error?: string } {
  const result = TerminalScreenStreamPayloadSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid terminal screen stream payload: ${formatted}` };
  }
  return { success: true, data: result.data as TerminalScreenStreamPayload };
}

export function isTerminalPtyFramePayload(raw: unknown): raw is TerminalPtyFramePayload {
  return TerminalPtyFramePayloadSchema.safeParse(raw).success;
}

export function validateTerminalPtyFramePayload(raw: unknown): { success: boolean; data?: TerminalPtyFramePayload; error?: string } {
  const result = TerminalPtyFramePayloadSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid terminal PTY frame payload: ${formatted}` };
  }
  return { success: true, data: result.data as TerminalPtyFramePayload };
}


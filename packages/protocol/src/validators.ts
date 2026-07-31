import { BaseEnvelopeSchema } from './schemas.js';
import type { EventEnvelope } from './types.js';

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

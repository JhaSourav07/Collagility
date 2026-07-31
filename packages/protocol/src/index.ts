import { z } from 'zod';

export const PROTOCOL_VERSION = '1.0';

export const BaseEnvelopeSchema = z.object({
  version: z.string().default(PROTOCOL_VERSION),
  id: z.string().uuid(),
  event: z.string(),
  type: z.enum(['REQUEST', 'RESPONSE', 'EVENT', 'ERROR']),
  seq: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
  sessionId: z.string(),
  workspaceId: z.string(),
});

export type BaseEnvelope = z.infer<typeof BaseEnvelopeSchema>;

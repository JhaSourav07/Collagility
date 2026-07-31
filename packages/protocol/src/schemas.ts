import { z } from 'zod';
import { CURRENT_PROTOCOL_VERSION } from './constants.js';

export const EventSenderSchema = z.object({
  id: z.string().min(1, 'Sender ID is required'),
  name: z.string().optional(),
  role: z.enum(['owner', 'member', 'system', 'ai']).optional(),
});

export const BaseEnvelopeSchema = z.object({
  version: z.number().int().default(CURRENT_PROTOCOL_VERSION),
  id: z.string().min(1, 'Event ID is required'),
  timestamp: z.number().int().positive(),
  seq: z.number().int().nonnegative().optional(),
  sessionId: z.string().optional(),
  sender: EventSenderSchema.optional(),
  type: z.string().min(1, 'Type is required'),
  payload: z.unknown().optional(),
});

export const ChatMessagePayloadSchema = z.object({
  text: z.string().min(1, 'Chat message text cannot be empty'),
  format: z.enum(['plain', 'markdown']).optional().default('plain'),
});

export const ChatSystemPayloadSchema = z.object({
  message: z.string().min(1, 'System message cannot be empty'),
  level: z.enum(['info', 'warn', 'error']).optional().default('info'),
});

export const ErrorPayloadSchema = z.object({
  error: z.string().min(1, 'Error message is required'),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

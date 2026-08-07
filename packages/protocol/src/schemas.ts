import { z } from 'zod';
import { CURRENT_PROTOCOL_VERSION } from './constants.js';

export const EventSenderSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  role: z.enum(['owner', 'member', 'system', 'ai']).optional(),
});

export const BaseEnvelopeSchema = z.object({
  version: z.number().default(CURRENT_PROTOCOL_VERSION),
  id: z.string().uuid(),
  timestamp: z.number(),
  seq: z.number().optional(),
  sessionId: z.string().optional(),
  sender: EventSenderSchema.optional(),
  type: z.string(),
  payload: z.unknown(),
});

export const ChatMessagePayloadSchema = z.object({
  text: z.string(),
  format: z.enum(['plain', 'markdown']).default('plain').optional(),
});

export const ChatSystemPayloadSchema = z.object({
  message: z.string(),
  level: z.enum(['info', 'warn', 'error']).default('info').optional(),
});

export const ErrorPayloadSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

// AI Schemas (Milestone 6)
export const AIPromptPayloadSchema = z.object({
  prompt: z.string(),
  context: z.record(z.unknown()).optional(),
});

export const AIStatusPayloadSchema = z.object({
  adapterName: z.string(),
  status: z.enum(['uninitialized', 'initializing', 'ready', 'processing', 'cancelled', 'failed', 'stopped']),
  message: z.string().optional(),
});

export const AICompletedPayloadSchema = z.object({
  adapterName: z.string(),
  response: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const AIFAILEDPayloadSchema = z.object({
  adapterName: z.string(),
  error: z.string(),
  code: z.string().optional(),
});

export const AICancelledPayloadSchema = z.object({
  adapterName: z.string(),
  reason: z.string().optional(),
});

export const AIChunkPayloadSchema = z.object({
  adapterName: z.string(),
  messageId: z.string(),
  chunkIndex: z.number(),
  content: z.string(),
  isFinal: z.boolean(),
});

export const TerminalScreenStreamPayloadSchema = z.object({
  sessionId: z.string(),
  senderId: z.string(),
  pane: z.enum(['right', 'left', 'main']),
  data: z.string(),
  cols: z.number().optional(),
  rows: z.number().optional(),
  timestamp: z.number(),
});

export const TerminalPtyFramePayloadSchema = z.object({
  sessionId: z.string(),
  paneId: z.string().default('main'),
  seq: z.number(),
  encoding: z.enum(['utf8', 'base64']).default('utf8'),
  data: z.string(),
  isSnapshot: z.boolean().default(false),
  cols: z.number().optional(),
  rows: z.number().optional(),
  timestamp: z.number(),
});


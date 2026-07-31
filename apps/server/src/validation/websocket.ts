import { z } from 'zod';
import type { IncomingMessage } from '../types/client.js';
import type { ServerLogger } from '../logger/logger.js';

export const BaseIncomingPacketSchema = z.object({
  type: z.string({ required_error: 'Packet type is required' }).min(1, 'Type cannot be empty'),
  payload: z.unknown().optional(),
});

export const CreateSessionPacketSchema = z.object({
  type: z.literal('session.create'),
  payload: z.object({
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

export const JoinSessionPacketSchema = z.object({
  type: z.literal('session.join'),
  payload: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
});

export const LeaveSessionPacketSchema = z.object({
  type: z.literal('session.leave'),
  payload: z.unknown().optional(),
});

export const ChatPayloadSchema = z.object({
  text: z.string().min(1, 'Chat message text cannot be empty'),
});

export class MessageValidator {
  private logger: ServerLogger;

  constructor(logger: ServerLogger) {
    this.logger = logger;
  }

  public validate(rawMessage: string): { success: true; data: IncomingMessage } | { success: false; error: string } {
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawMessage);
    } catch (err) {
      const errorMsg = 'Invalid JSON structure';
      this.logger.warn({ rawMessage, error: err }, 'Message validation failed: JSON parse error');
      return { success: false, error: errorMsg };
    }

    const result = BaseIncomingPacketSchema.safeParse(parsedJson);

    if (!result.success) {
      const formattedErrors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      const errorMsg = `Invalid packet schema: ${formattedErrors}`;
      this.logger.warn({ rawMessage, errors: result.error.errors }, 'Message validation failed: Schema error');
      return { success: false, error: errorMsg };
    }

    // Specific packet validation rules
    const packet = result.data;
    if (packet.type === 'session.join') {
      const joinValidation = JoinSessionPacketSchema.safeParse(packet);
      if (!joinValidation.success) {
        return { success: false, error: 'Invalid session.join payload: sessionId is required' };
      }
    }

    return { success: true, data: packet };
  }
}

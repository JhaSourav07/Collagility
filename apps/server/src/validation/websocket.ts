import { z } from 'zod';
import type { IncomingMessage } from '../types/client.js';
import type { ServerLogger } from '../logger/logger.js';

export const BaseIncomingPacketSchema = z.object({
  type: z.string({ required_error: 'Packet type is required' }).min(1, 'Type cannot be empty'),
  payload: z.unknown().optional(),
});

export const ChatPayloadSchema = z.object({
  text: z.string().min(1, 'Chat message text cannot be empty'),
});

export const PingPayloadSchema = z.object({}).optional();

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

    return { success: true, data: result.data };
  }
}

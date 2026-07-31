import { describe, it, expect } from 'vitest';
import { MessageValidator } from './websocket.js';
import { logger } from '../logger/logger.js';

describe('MessageValidator', () => {
  const validator = new MessageValidator(logger);

  it('should successfully validate valid JSON with string type', () => {
    const validPacket = JSON.stringify({
      type: 'chat',
      payload: { text: 'Hello Collagility!' },
    });

    const result = validator.validate(validPacket);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('chat');
      expect(result.data.payload).toEqual({ text: 'Hello Collagility!' });
    }
  });

  it('should fail validation on invalid JSON format', () => {
    const invalidJson = '{ type: "chat", invalid...';

    const result = validator.validate(invalidJson);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON structure');
    }
  });

  it('should fail validation when packet lacks type field', () => {
    const missingType = JSON.stringify({ payload: { foo: 'bar' } });

    const result = validator.validate(missingType);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid packet schema');
    }
  });
});

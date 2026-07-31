import { describe, it, expect } from 'vitest';
import { BaseEnvelopeSchema, PROTOCOL_VERSION } from './index.js';
describe('@collagility/protocol', () => {
    it('should validate a correct base envelope frame', () => {
        const validFrame = {
            version: PROTOCOL_VERSION,
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            event: 'system.ping',
            type: 'EVENT',
            seq: 1,
            timestamp: Date.now(),
            sessionId: 'sess_123',
            workspaceId: 'ws_456',
        };
        const parsed = BaseEnvelopeSchema.safeParse(validFrame);
        expect(parsed.success).toBe(true);
    });
});
//# sourceMappingURL=index.test.js.map
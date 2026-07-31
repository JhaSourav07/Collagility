import { describe, it, expect } from 'vitest';
describe('@collagility/types', () => {
    it('should construct a valid Participant object structure', () => {
        const participant = {
            userId: 'usr_123',
            role: 'HOST',
            clientType: 'CLI',
            connectedAt: 1774900000000,
        };
        expect(participant.userId).toBe('usr_123');
        expect(participant.role).toBe('HOST');
    });
});
//# sourceMappingURL=index.test.js.map
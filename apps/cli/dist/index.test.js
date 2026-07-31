import { describe, it, expect } from 'vitest';
import { createCliProgram } from './index.js';
describe('@collagility/cli', () => {
    it('should initialize commander CLI program with name collagility', () => {
        const program = createCliProgram();
        expect(program.name()).toBe('collagility');
    });
});
//# sourceMappingURL=index.test.js.map
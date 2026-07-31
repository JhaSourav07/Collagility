import { describe, it, expect } from 'vitest';
import { createServer } from './index.js';
describe('@collagility/server', () => {
    it('should respond to GET /health with status ok', async () => {
        const { server } = createServer();
        const response = await server.inject({
            method: 'GET',
            url: '/health',
        });
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('ok');
        expect(body.service).toBe('collagility-server');
    });
});
//# sourceMappingURL=index.test.js.map
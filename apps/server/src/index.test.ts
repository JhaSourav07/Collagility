import { describe, it, expect } from 'vitest';
import { buildServer } from './server.js';

describe('@collagility/server', () => {
  it('should respond to GET /health with status ok', async () => {
    const { app } = buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('collagility-server');
  });
});

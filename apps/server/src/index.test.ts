import { describe, it, expect } from 'vitest';
import { buildServer } from './server.js';
import { spawn } from 'node:child_process';
import fileUrl from 'node:url';
import path from 'node:path';

const __filename = fileUrl.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  it('should start real process and print startup log when node index.js is executed', async () => {
    const distIndexPath = path.resolve(__dirname, '../dist/index.js');
    const child = spawn('node', [distIndexPath], {
      env: { ...process.env, PORT: '8099', NODE_ENV: 'production' },
    });

    const output = await new Promise<string>((resolve, reject) => {
      let accumulated = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Process timed out waiting for server listening log. Accumulated: ${accumulated}`));
      }, 5000);

      child.stdout?.on('data', (data) => {
        accumulated += data.toString();
        if (accumulated.includes('Collagility Realtime Server listening')) {
          clearTimeout(timer);
          resolve(accumulated);
        }
      });

      child.stderr?.on('data', (data) => {
        accumulated += data.toString();
        if (accumulated.includes('Collagility Realtime Server listening')) {
          clearTimeout(timer);
          resolve(accumulated);
        }
      });
    });

    expect(output).toContain('Collagility Realtime Server listening');
    child.kill('SIGTERM');
  });
});

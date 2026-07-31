import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer, type ServerInstance } from '../../../server/src/server.js';
import { WebSocketClient } from './ws-client.js';
import { createConfig } from '../config/config.js';

describe('WebSocketClient', () => {
  let serverInstance: ServerInstance;
  let serverUrl: string;

  beforeAll(async () => {
    serverInstance = buildServer();
    await serverInstance.listen(0, '127.0.0.1');
    const port = (serverInstance.app.server.address() as { port: number }).port;
    serverUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterAll(async () => {
    await serverInstance.close();
  });

  it('should connect to server and receive system.connected packet', async () => {
    const config = createConfig({ serverUrl });
    let connectedClientId = '';

    const client = new WebSocketClient(config, {
      onConnected: (id) => {
        connectedClientId = id;
      },
    });

    const clientId = await client.connect();
    expect(clientId).toBeDefined();
    expect(connectedClientId).toBe(clientId);

    client.disconnect();
  });
});

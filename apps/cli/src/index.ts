#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { main } from './main.js';

export { createProgram } from './main.js';
export { WebSocketClient } from './client/ws-client.js';
export { ReconnectHandler } from './client/reconnect.js';

if (process.env['NODE_ENV'] !== 'test') {
  const currentFilePath = fileURLToPath(import.meta.url);
  if (process.argv[1] && (process.argv[1] === currentFilePath || process.argv[1].endsWith('index.js'))) {
    main();
  }
}

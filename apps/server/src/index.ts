import { fileURLToPath } from 'node:url';
import { buildServer, type ServerInstance } from './server.js';
import { logger } from './logger/logger.js';

export { buildServer, type ServerInstance };


import os from 'node:os';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

async function main() {
  const server = buildServer();
  const PORT = Number(process.env['PORT'] || 8080);
  const HOST = process.env['HOST'] || '0.0.0.0';

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received termination signal, starting graceful shutdown');
    try {
      await server.close();
      process.exit(0);
    } catch (err) {
      logger.error({ error: err }, 'Error during server shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ error: err }, 'Uncaught exception encountered');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection encountered');
    shutdown('unhandledRejection');
  });

  try {
    await server.listen(PORT, HOST);
    const lanIp = getLocalIpAddress();
    console.log(`\n🚀 Collagility Realtime Server Listening`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${lanIp}:${PORT}`);
    console.log(`\n💡 Team Members can join sessions using:`);
    console.log(`   collagility join <sessionId>@${lanIp}\n`);
  } catch (err) {
    logger.fatal({ error: err }, 'Failed to start Collagility server');
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  const isDirectRun = Boolean(
    process.argv[1] &&
      (process.argv[1].endsWith('apps/server/dist/index.js') ||
        process.argv[1].endsWith('@collagility/server/dist/index.js') ||
        (process.argv[1].endsWith('index.js') && !process.argv[1].includes('cli')))
  );
  if (isDirectRun) {
    main();
  }
}



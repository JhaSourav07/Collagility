import { fileURLToPath } from 'node:url';
import { buildServer } from './server.js';
import { logger } from './logger/logger.js';

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
  } catch (err) {
    logger.fatal({ error: err }, 'Failed to start Collagility server');
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  const currentFilePath = fileURLToPath(import.meta.url);
  if (process.argv[1] && (process.argv[1] === currentFilePath || process.argv[1].endsWith('index.js'))) {
    main();
  }
}

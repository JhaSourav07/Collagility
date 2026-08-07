import { buildServer } from '@collagility/server';
import type { CLIConfig } from '../config/config.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';

interface HealthResponse {
  status: string;
  activeClients: number;
  activeSessions: number;
}

export async function serverCommand(action: 'start' | 'status', options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);

  let port = 8080;
  let host = '0.0.0.0';

  if (process.env['PORT']) {
    port = Number(process.env['PORT']);
  } else if (options.httpUrl) {
    try {
      const parsed = new URL(options.httpUrl);
      if (parsed.port) port = Number(parsed.port);
      if (parsed.hostname) host = parsed.hostname;
    } catch {
      // ignore URL parse errors, fallback to default
    }
  }
  if (process.env['HOST']) {
    host = process.env['HOST'];
  }

  const checkHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const targetUrl = `http://${checkHost}:${port}`;

  if (action === 'status' || !action) {
    const httpUrl = options.httpUrl || targetUrl;
    try {
      const response = await fetch(`${httpUrl}/health`);
      if (response.ok) {
        const body = (await response.json()) as HealthResponse;
        logger.success(`Collagility Server is running at ${colors.cyan(httpUrl)}`);
        logger.info(
          `Status: ${colors.green(body.status)} | Active Clients: ${colors.bold(
            String(body.activeClients)
          )} | Active Sessions: ${colors.bold(String(body.activeSessions))}`
        );
      } else {
        logger.error(`Server returned HTTP status ${response.status}`);
      }
    } catch {
      logger.error(
        `Server is unreachable at '${httpUrl}'. Start it with 'collagility server start'`
      );
    }
    return;
  }

  if (action === 'start') {
    // Check if server is already running on target URL
    try {
      const response = await fetch(`${targetUrl}/health`);
      if (response.ok) {
        logger.success(`Collagility Server is already active at ${colors.cyan(targetUrl)}`);
        return;
      }
    } catch {
      // Not running yet, proceed with starting
    }

    logger.info('Starting local Collagility Realtime Server instance...');
    try {
      const server = buildServer();
      const address = await server.listen(port, host);
      logger.success(`Collagility Server listening at ${colors.cyan(address)}`);

      const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down server gracefully...`);
        try {
          await server.close();
          process.exit(0);
        } catch (err) {
          logger.error('Error during server shutdown', err);
          process.exit(1);
        }
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error: any) {
      if (error && error.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} is already in use.`);
        try {
          const resp = await fetch(`${targetUrl}/health`);
          if (resp.ok) {
            logger.success(`Collagility Server is active at ${colors.cyan(targetUrl)}`);
            return;
          }
        } catch {
          logger.error(`Port ${port} is occupied by another process. Kill the process on port ${port} or set PORT=<port>.`);
        }
      } else {
        logger.error('Failed to start local server instance', error);
      }
    }
  }
}

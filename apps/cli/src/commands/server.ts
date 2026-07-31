import { spawn } from 'node:child_process';
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

  if (action === 'status' || !action) {
    const httpUrl = options.httpUrl || 'http://localhost:8080';
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
        `Server is unreachable at '${httpUrl}'. Start it with 'collagility server start' or 'pnpm --filter @collagility/server start'`
      );
    }
    return;
  }

  if (action === 'start') {
    logger.info('Starting local Collagility Realtime Server instance...');
    try {
      const child = spawn('pnpm', ['--filter', '@collagility/server', 'start'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('error', (err) => {
        logger.error('Failed to spawn server process', err);
      });
    } catch (error) {
      logger.error('Failed to start local server instance', error);
    }
  }
}

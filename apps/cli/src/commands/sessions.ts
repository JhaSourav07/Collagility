import type { CLIConfig } from '../config/config.js';
import { CLILogger } from '../terminal/logger.js';
import { colors } from '../terminal/colors.js';

interface HealthResponse {
  service: string;
  activeClients: number;
  activeSessions: number;
}

export async function sessionsCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const httpUrl = options.httpUrl || 'http://localhost:8080';

  try {
    const response = await fetch(`${httpUrl}/health`);
    if (response.ok) {
      const body = (await response.json()) as HealthResponse;
      logger.info(`Server Health & Session Summary (${colors.cyan(httpUrl)})`);
      console.log(`  • Service: ${colors.bold(body.service)}`);
      console.log(`  • Active Connections: ${colors.bold(String(body.activeClients))}`);
      console.log(`  • Active Shared Sessions: ${colors.bold(String(body.activeSessions))}`);
    } else {
      logger.error(`Failed to fetch sessions: HTTP ${response.status}`);
    }
  } catch {
    logger.error(`Unable to query server at '${httpUrl}'`);
  }
}

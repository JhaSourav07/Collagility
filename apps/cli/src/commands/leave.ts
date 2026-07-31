import type { CLIConfig } from '../config/config.js';
import { establishConnection } from '../client/connection.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';
import { CLILogger } from '../terminal/logger.js';

export async function leaveCommand(options: Partial<CLIConfig>): Promise<void> {
  const logger = new CLILogger(options.verbose);
  const spinner = new CLIProgressSpinner('Connecting to server to leave active session...');
  spinner.start();

  try {
    const client = await establishConnection(options as CLIConfig, {
      onSessionLeft: (sessionId) => {
        spinner.stop(true, `Successfully left session '${sessionId}'`);
        client.disconnect();
        process.exit(0);
      },

      onError: (error) => {
        spinner.stop(false, `Leave error: ${error}`);
        client.disconnect();
        process.exit(1);
      },
    });

    client.leaveSession();
  } catch (error) {
    logger.error('Failed to leave session', error);
    process.exit(1);
  }
}

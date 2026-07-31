import type { CLIConfig } from '../config/config.js';
import { WebSocketClient, type WSClientEvents } from './ws-client.js';
import { CLIProgressSpinner } from '../terminal/spinner.js';

export async function establishConnection(
  config: CLIConfig,
  events: WSClientEvents = {},
  spinner?: CLIProgressSpinner
): Promise<WebSocketClient> {
  const client = new WebSocketClient(config, events);

  try {
    await client.connect();
    if (spinner) {
      spinner.stop(true, 'Connected to Collagility server');
    }
    return client;
  } catch (error) {
    if (spinner) {
      spinner.stop(false, `Failed to connect to '${config.serverUrl}'`);
    }
    throw error;
  }
}

import {
  DEFAULT_SERVER_URL,
  DEFAULT_HTTP_SERVER_URL,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_RECONNECT_INTERVAL_MS,
} from './constants.js';

export interface CLIConfig {
  serverUrl: string;
  httpUrl: string;
  verbose: boolean;
  mockMode?: boolean;
  cliBinary?: string;
  cliVersion?: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectIntervalMs: number;
}

export function createConfig(options: Partial<CLIConfig> = {}): CLIConfig {
  const serverUrl = options.serverUrl || DEFAULT_SERVER_URL;
  const httpUrl = options.httpUrl || serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '');

  return {
    serverUrl,
    httpUrl: httpUrl || DEFAULT_HTTP_SERVER_URL,
    verbose: options.verbose || false,
    mockMode: options.mockMode || false,
    cliBinary: options.cliBinary,
    cliVersion: options.cliVersion,
    autoReconnect: options.autoReconnect !== false,
    maxReconnectAttempts: options.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS,
    reconnectIntervalMs: options.reconnectIntervalMs || DEFAULT_RECONNECT_INTERVAL_MS,
  };
}

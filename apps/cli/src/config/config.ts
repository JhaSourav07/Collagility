import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  DEFAULT_SERVER_URL,
  DEFAULT_HTTP_SERVER_URL,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_RECONNECT_INTERVAL_MS,
} from './constants.js';

export interface GlobalUserConfig {
  serverUrl?: string;
  defaultCli?: string;
  securityMode?: string;
}

export interface CLIConfig {
  serverUrl: string;
  httpUrl: string;
  verbose: boolean;
  mockMode?: boolean;
  cliBinary?: string;
  cliVersion?: string;
  resumeSessionId?: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectIntervalMs: number;
}

export function getGlobalConfigFilePath(): string {
  return path.join(os.homedir(), '.collagility', 'config.json');
}

export function loadGlobalUserConfig(): GlobalUserConfig {
  try {
    const filePath = getGlobalConfigFilePath();
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as GlobalUserConfig;
  } catch {
    return {};
  }
}

export function saveGlobalUserConfig(config: GlobalUserConfig): void {
  try {
    const filePath = getGlobalConfigFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existing = loadGlobalUserConfig();
    const merged = { ...existing, ...config };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {
    // Ignore config write failures
  }
}

/**
 * Normalizes input server URLs into valid WebSocket endpoints.
 * Examples:
 * - "192.168.1.50" -> "ws://192.168.1.50:8080/ws"
 * - "192.168.1.50:9000" -> "ws://192.168.1.50:9000/ws"
 * - "http://192.168.1.50:8080" -> "ws://192.168.1.50:8080/ws"
 * - "ws://192.168.1.50:8080/ws" -> "ws://192.168.1.50:8080/ws"
 */
export function normalizeServerUrl(rawInput?: string): string {
  if (!rawInput || !rawInput.trim()) {
    const userConfig = loadGlobalUserConfig();
    if (userConfig.serverUrl) {
      return normalizeServerUrl(userConfig.serverUrl);
    }
    return DEFAULT_SERVER_URL;
  }

  let trimmed = rawInput.trim();

  // Handle http(s) prefixes
  if (trimmed.startsWith('http://')) {
    trimmed = 'ws://' + trimmed.slice(7);
  } else if (trimmed.startsWith('https://')) {
    trimmed = 'wss://' + trimmed.slice(8);
  } else if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    // Bare IP or host:port
    if (!trimmed.includes(':')) {
      trimmed = `${trimmed}:8080`;
    }
    trimmed = `ws://${trimmed}`;
  }

  // Ensure trailing /ws path endpoint
  if (!trimmed.endsWith('/ws')) {
    trimmed = `${trimmed.replace(/\/$/, '')}/ws`;
  }

  return trimmed;
}

export function createConfig(options: Partial<CLIConfig> = {}): CLIConfig {
  const serverUrl = normalizeServerUrl(options.serverUrl);
  const httpUrl = options.httpUrl || serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '');

  // Save successful server choice to user config
  if (options.serverUrl) {
    saveGlobalUserConfig({ serverUrl });
  }

  return {
    serverUrl,
    httpUrl: httpUrl || DEFAULT_HTTP_SERVER_URL,
    verbose: options.verbose || false,
    mockMode: options.mockMode || false,
    cliBinary: options.cliBinary,
    cliVersion: options.cliVersion,
    resumeSessionId: options.resumeSessionId,
    autoReconnect: options.autoReconnect !== false,
    maxReconnectAttempts: options.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS,
    reconnectIntervalMs: options.reconnectIntervalMs || DEFAULT_RECONNECT_INTERVAL_MS,
  };
}

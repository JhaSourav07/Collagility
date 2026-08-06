import { colors } from '../terminal/colors.js';
import {
  loadGlobalUserConfig,
  saveGlobalUserConfig,
  normalizeServerUrl,
  getGlobalConfigFilePath,
} from '../config/config.js';

export function handleConfigCommand(key?: string, value?: string): void {
  const filePath = getGlobalConfigFilePath();

  if (!key) {
    // Show current global configuration
    const current = loadGlobalUserConfig();
    console.log(colors.bold('\n⚙  Collagility Global Configuration'));
    console.log(colors.dim(`Config file: ${filePath}\n`));
    console.log(`  ${colors.cyan('server')}: ${current.serverUrl || colors.dim('(default: ws://localhost:8080/ws)')}`);
    console.log(`  ${colors.cyan('defaultCli')}: ${current.defaultCli || colors.dim('(default: agy)')}\n`);
    return;
  }

  if (key === 'set') {
    // Handling "collagility config set <key> <val>" or "collagility config set server <ip>"
    console.log(colors.error('Usage: collagility config set server <ip-or-url>'));
    return;
  }

  if (key === 'get') {
    const current = loadGlobalUserConfig();
    console.log(current.serverUrl || 'ws://localhost:8080/ws');
    return;
  }
}

export function handleConfigSetCommand(key: string, value: string): void {
  if (key.toLowerCase() === 'server' || key.toLowerCase() === 'serverurl') {
    const normalized = normalizeServerUrl(value);
    saveGlobalUserConfig({ serverUrl: normalized });
    console.log(colors.green(`\n✓ Saved default server: ${normalized}`));
    console.log(colors.dim(`  Saved to: ${getGlobalConfigFilePath()}\n`));
  } else if (key.toLowerCase() === 'cli' || key.toLowerCase() === 'defaultcli') {
    saveGlobalUserConfig({ defaultCli: value });
    console.log(colors.green(`\n✓ Saved default AI CLI: ${value}\n`));
  } else {
    console.log(colors.error(`Unknown config key '${key}'. Valid keys: 'server', 'cli'`));
  }
}

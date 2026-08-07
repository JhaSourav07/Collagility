#!/usr/bin/env node
import { Command } from 'commander';
import { CLI_VERSION } from './config/constants.js';
import { createConfig } from './config/config.js';
import { renderBanner } from './terminal/banner.js';
import { startCommand } from './commands/start.js';
import { joinCommand } from './commands/join.js';
import { leaveCommand } from './commands/leave.js';
import { serverCommand } from './commands/server.js';
import { sessionsCommand } from './commands/sessions.js';
import { versionCommand } from './commands/version.js';
import { handleConfigCommand, handleConfigSetCommand } from './commands/config.js';
import { checkTmuxAvailable } from './terminal/tmux/tmux-guard.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('collagility')
    .description('Terminal CLI application for Collagility host and participant sessions')
    .version(CLI_VERSION)
    .option('-s, --server <url>', 'Collagility WebSocket server URL')
    .option('-v, --verbose', 'Enable verbose debug logging')
    .option('--no-reconnect', 'Disable automatic reconnection logic');

  program
    .command('start')
    .alias('host')
    .description('Create and host a new realtime collaboration session')
    .option('-c, --cli <binary>', 'Specify AI CLI executable name or path (e.g., antigravity, gemini)')
    .option('--cli-version <ver>', 'Specify or override AI CLI version')
    .option('-r, --resume <session>', 'Resume an existing collaboration session from disk checkpoint')
    .option('-m, --mock', 'Run in mock AI mode without spawning real CLI process')
    .action(async (cmdOpts) => {
      const tmuxCheck = await checkTmuxAvailable();
      if (!tmuxCheck.ok) {
        console.error(`\n✖ ${tmuxCheck.reason}\n`);
        process.exit(1);
      }
      const opts = program.opts();
      const config = createConfig({
        serverUrl: opts.server,
        verbose: opts.verbose,
        autoReconnect: opts.reconnect,
        cliBinary: cmdOpts.cli,
        cliVersion: cmdOpts.cliVersion,
        resumeSessionId: cmdOpts.resume,
        mockMode: cmdOpts.mock,
      });
      await startCommand(config);
    });

  program
    .command('join <session>')
    .description('Join an existing active collaboration session by ID')
    .action(async (sessionId: string) => {
      const opts = program.opts();
      const config = createConfig({
        serverUrl: opts.server,
        verbose: opts.verbose,
        autoReconnect: opts.reconnect,
      });
      await joinCommand(sessionId, config);
    });

  program
    .command('leave')
    .description('Leave the current active session gracefully')
    .action(async () => {
      const opts = program.opts();
      const config = createConfig({
        serverUrl: opts.server,
        verbose: opts.verbose,
      });
      await leaveCommand(config);
    });

  program
    .command('server [action]')
    .description('Manage local Collagility Realtime Server instance (action: start | status)')
    .action(async (action?: string) => {
      const opts = program.opts();
      const config = createConfig({
        verbose: opts.verbose,
      });
      await serverCommand((action as 'start' | 'status') || 'status', config);
    });

  program
    .command('sessions')
    .description('List active collaboration sessions and server status')
    .action(async () => {
      const opts = program.opts();
      const config = createConfig({
        verbose: opts.verbose,
      });
      await sessionsCommand(config);
    });

  program
    .command('version')
    .description('Display CLI and platform version banner')
    .action(() => {
      versionCommand();
    });

  const configCmd = program.command('config').description('Manage persistent Collagility user configuration');

  configCmd
    .command('get [key]')
    .description('Display saved configuration settings')
    .action((key?: string) => {
      handleConfigCommand('get', key);
    });

  configCmd
    .command('set <key> <value>')
    .description('Save default configuration setting (key: server | cli)')
    .action((key: string, value: string) => {
      handleConfigSetCommand(key, value);
    });

  program.addHelpText('before', renderBanner());

  return program;
}

export function main(): void {
  const program = createProgram();
  program.parse(process.argv);
}

if (process.env['NODE_ENV'] !== 'test') {
  const isDirectMain = Boolean(
    process.argv[1] && process.argv[1].endsWith('main.js')
  );
  if (isDirectMain) {
    main();
  }
}


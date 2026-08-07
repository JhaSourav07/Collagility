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
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { handleConfigCommand, handleConfigSetCommand } from './commands/config.js';
import { checkTmuxAvailable } from './terminal/tmux/tmux-guard.js';
import { TmuxSession } from './terminal/tmux/tmux-session.js';

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
    .option('--pane <type>', 'Internal pane type identifier (e.g., chat)')
    .option('--session-name <name>', 'Tmux session name')
    .action(async (cmdOpts) => {
      if (cmdOpts.sessionName) {
        process.env['COLLAGILITY_TMUX_SESSION'] = cmdOpts.sessionName;
      }

      if (cmdOpts.pane === 'chat' || process.env['COLLAGILITY_INTERNAL_PANE'] === 'chat') {
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
        return;
      }

      const tmuxCheck = await checkTmuxAvailable();
      if (!tmuxCheck.ok) {
        console.error(`\n✖ ${tmuxCheck.reason}\n`);
        process.exit(1);
      }

      const opts = program.opts();
      const sessionId =
        cmdOpts.resume ||
        `sess-${Math.random().toString(36).substring(2, 8)}`;
      const sessionName = `collagility-${sessionId}`;
      process.env['COLLAGILITY_TMUX_SESSION'] = sessionName;
      const targetBinary = cmdOpts.cli || 'agy';
      const logPath = path.join(os.tmpdir(), `${sessionName}-right.log`);

      try {
        fs.writeFileSync(logPath, '');
      } catch {
        // Ignore log file creation error
      }

      const leftCommand = [
        process.argv[0],
        process.argv[1],
        'start',
        '--pane',
        'chat',
        '--session-name',
        sessionName,
        ...(cmdOpts.cli ? ['--cli', cmdOpts.cli] : []),
        ...(cmdOpts.cliVersion ? ['--cli-version', cmdOpts.cliVersion] : []),
        ...(cmdOpts.resume ? ['--resume', cmdOpts.resume] : []),
        ...(cmdOpts.mock ? ['--mock'] : []),
        ...(opts.server ? ['--server', opts.server] : []),
        ...(opts.verbose ? ['--verbose'] : []),
      ];

      const rightCommand = [targetBinary];

      const tmuxSession = new TmuxSession();
      try {
        await tmuxSession.createSplitSession(sessionName, leftCommand, rightCommand, 62);
        await tmuxSession.pipePane(sessionName, 1, logPath);
        await tmuxSession.attach(sessionName);
      } catch (err) {
        console.error(`✖ Failed to start tmux session: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });

  program
    .command('join <session>')
    .description('Join an existing active collaboration session by ID')
    .option('--pane <type>', 'Internal pane type identifier (e.g., chat)')
    .option('--session-name <name>', 'Tmux session name (set internally)')
    .action(async (sessionId: string, cmdOpts: { pane?: string; sessionName?: string }) => {
      const opts = program.opts();

      // ── Internal: chat pane already inside a tmux split ──────────────────
      if (cmdOpts.sessionName) {
        process.env['COLLAGILITY_TMUX_SESSION'] = cmdOpts.sessionName;
      }
      if (cmdOpts.pane === 'chat' || process.env['COLLAGILITY_INTERNAL_PANE'] === 'chat') {
        const config = createConfig({
          serverUrl: opts.server,
          verbose: opts.verbose,
          autoReconnect: opts.reconnect,
        });
        await joinCommand(sessionId, config);
        return;
      }

      // ── Outer: create tmux split so the visitor also gets a right pane ───
      const tmuxCheck = await checkTmuxAvailable();
      if (!tmuxCheck.ok) {
        // tmux not available — fall back to single-pane join
        const config = createConfig({
          serverUrl: opts.server,
          verbose: opts.verbose,
          autoReconnect: opts.reconnect,
        });
        await joinCommand(sessionId, config);
        return;
      }

      const sessionName = `collagility-join-${sessionId}`;
      const logPath = path.join(os.tmpdir(), `${sessionName}-screenshare.log`);
      try {
        fs.writeFileSync(
          logPath,
          '\x1b[1;36m📺 LIVE AI SCREENSHARE\x1b[0m\n\x1b[2m(Streaming from host — zero tokens used)\x1b[0m\n\n'
        );
      } catch {
        // Ignore log creation error
      }

      process.env['COLLAGILITY_TMUX_SESSION'] = sessionName;
      process.env['COLLAGILITY_SCREENSHARE_LOG'] = logPath;

      const leftCommand = [
        process.argv[0],
        process.argv[1],
        'join',
        sessionId,
        '--pane',
        'chat',
        '--session-name',
        sessionName,
        ...(opts.server ? ['--server', opts.server] : []),
        ...(opts.verbose ? ['--verbose'] : []),
      ];

      // Right pane streams real-time AI chunk output directly from log file
      const rightCommand = ['tail', '-f', '-n', '+1', logPath];

      const tmuxSession = new TmuxSession();
      try {
        await tmuxSession.createSplitSession(sessionName, leftCommand, rightCommand, 62);
        await tmuxSession.attach(sessionName);
      } catch (err) {
        console.error(`✖ Failed to start screenshare session: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
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


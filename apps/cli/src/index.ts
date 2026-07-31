#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import chalk from 'chalk';

export function createCliProgram() {
  const program = new Command();

  program
    .name('collagility')
    .description(chalk.cyan('The Multiplayer Workspace for AI Coding Agents'))
    .version('0.1.0');

  program
    .command('host')
    .description('Host a new collaborative AI coding session')
    .action(() => {
      console.log(chalk.green('Initializing Collagility host session...'));
    });

  program
    .command('join <sessionId>')
    .description('Join an existing collaborative AI coding session')
    .action((sessionId: string) => {
      console.log(chalk.blue(`Joining Collagility session ${sessionId}...`));
    });

  return program;
}

if (process.env['NODE_ENV'] !== 'test') {
  const currentFilePath = fileURLToPath(import.meta.url);
  if (process.argv[1] && (process.argv[1] === currentFilePath || process.argv[1].endsWith('index.js'))) {
    const program = createCliProgram();
    program.parse(process.argv);
  }
}

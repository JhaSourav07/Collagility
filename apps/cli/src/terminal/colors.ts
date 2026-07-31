import chalk from 'chalk';

export const colors = {
  brand: chalk.cyan.bold,
  accent: chalk.magenta.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  dim: chalk.gray,
  bold: chalk.bold,
  cyan: chalk.cyan,
  green: chalk.green,
  highlight: chalk.bgCyan.black.bold,
  code: chalk.yellow.bold,
  symbolSuccess: chalk.green('✔'),
  symbolError: chalk.red('✖'),
  symbolInfo: chalk.cyan('ℹ'),
  symbolWarning: chalk.yellow('⚠'),
  badgeOwner: chalk.bgYellow.black.bold(' OWNER '),
  badgeMember: chalk.bgBlue.white.bold(' MEMBER '),
};

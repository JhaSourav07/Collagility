import chalk from 'chalk';

export interface SelectionOption {
  key: string;
  label: string;
}

export class InteractivePromptRenderer {
  public static renderQuestion(prompt: string, options?: string[]): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(chalk.magenta.bold('[AI Question] ') + chalk.white(prompt));
    if (options && options.length > 0) {
      options.forEach((opt, idx) => {
        lines.push(chalk.cyan(`  ${idx + 1}. `) + chalk.gray(opt));
      });
      lines.push(chalk.dim(`  Enter choice number (1-${options.length}) or type response:`));
    }
    lines.push('');
    return lines.join('\n');
  }

  public static renderConfirmation(prompt: string, defaultValue = true): string {
    const defaultHint = defaultValue ? '(Y/n)' : '(y/N)';
    return `\n${chalk.yellow.bold('[AI Confirmation Required]:')} ${chalk.white(prompt)} ${chalk.magenta(defaultHint)}\n`;
  }

  public static renderSelectionMenu(title: string, options: SelectionOption[]): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(chalk.cyan.bold('[SELECT] ') + chalk.white.bold(title));
    options.forEach((opt, idx) => {
      lines.push(chalk.cyan(`  [${opt.key || idx + 1}] `) + chalk.gray(opt.label));
    });
    lines.push(chalk.dim('  Select an option to proceed:'));
    lines.push('');
    return lines.join('\n');
  }

  public static renderToolRequest(toolName: string, args?: Record<string, unknown>): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(chalk.yellow.bold('[TOOL APPROVAL REQUESTED]:'));
    lines.push(`  ${chalk.bold('Tool:')} ${chalk.cyan(toolName)}`);
    if (args && Object.keys(args).length > 0) {
      lines.push(`  ${chalk.bold('Arguments:')} ${chalk.gray(JSON.stringify(args))}`);
    }
    lines.push(chalk.yellow('  Approve tool execution? ') + chalk.magenta('(Y/n)'));
    lines.push('');
    return lines.join('\n');
  }
}

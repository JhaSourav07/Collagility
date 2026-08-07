import chalk from 'chalk';

export interface PlanData {
  planId?: string;
  title: string;
  steps?: string[];
  filePath?: string;
  content?: string;
  requiresApproval?: boolean;
  options?: string[];
}

export class PlanRenderer {
  public static renderPlan(plan: PlanData): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.cyan.bold('┌─────────────────────────────────────────────────────────────┐'));
    lines.push(chalk.cyan.bold('│ ') + chalk.bgHex('#0284c7').white.bold(' IMPLEMENTATION PLAN PROPOSED ') + ' '.repeat(28) + chalk.cyan.bold('│'));
    lines.push(chalk.cyan.bold('├─────────────────────────────────────────────────────────────┤'));
    lines.push(chalk.cyan.bold('│ ') + chalk.white.bold(plan.title.padEnd(58).slice(0, 58)) + chalk.cyan.bold('│'));

    if (plan.filePath) {
      const fileLine = `File: ${plan.filePath}`;
      lines.push(chalk.cyan.bold('│ ') + chalk.blue(fileLine.padEnd(58).slice(0, 58)) + chalk.cyan.bold('│'));
    }

    lines.push(chalk.cyan.bold('├─────────────────────────────────────────────────────────────┤'));

    if (plan.content) {
      const contentLines = plan.content.split(/\r?\n/);
      for (const cl of contentLines.slice(0, 15)) {
        lines.push(chalk.cyan.bold('│ ') + chalk.white(cl.padEnd(58).slice(0, 58)) + chalk.cyan.bold('│'));
      }
      if (contentLines.length > 15) {
        lines.push(chalk.cyan.bold('│ ') + chalk.yellow(`... (${contentLines.length - 15} more lines)`.padEnd(58)) + chalk.cyan.bold('│'));
      }
    } else if (plan.steps && plan.steps.length > 0) {
      plan.steps.forEach((step, index) => {
        const stepText = `${index + 1}. ${step}`;
        lines.push(chalk.cyan.bold('│ ') + chalk.gray(stepText.padEnd(58).slice(0, 58)) + chalk.cyan.bold('│'));
      });
    } else {
      lines.push(chalk.cyan.bold('│ ') + chalk.gray('Plan generated. Choose an action below to proceed.'.padEnd(58)) + chalk.cyan.bold('│'));
    }

    lines.push(chalk.cyan.bold('└─────────────────────────────────────────────────────────────┘'));

    if (plan.requiresApproval !== false) {
      const opts = plan.options || ['[y] Accept & Proceed', '[r] Read Plan', '[n] Reject & Modify'];
      lines.push(chalk.yellow.bold('  Actions: ') + chalk.cyan(opts.join('   ')));
    }
    lines.push('');

    return lines.join('\n');
  }
}

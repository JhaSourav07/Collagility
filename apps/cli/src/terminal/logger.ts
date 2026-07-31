import { colors } from './colors.js';

export class CLILogger {
  private verboseEnabled: boolean;

  constructor(verbose = false) {
    this.verboseEnabled = verbose;
  }

  public setVerbose(verbose: boolean): void {
    this.verboseEnabled = verbose;
  }

  public info(message: string): void {
    console.log(`${colors.symbolInfo} ${message}`);
  }

  public success(message: string): void {
    console.log(`${colors.symbolSuccess} ${message}`);
  }

  public warn(message: string): void {
    console.log(`${colors.symbolWarning} ${colors.warning(message)}`);
  }

  public error(message: string, error?: unknown): void {
    console.error(`${colors.symbolError} ${colors.error(message)}`);
    if (error && this.verboseEnabled) {
      console.error(colors.dim(error instanceof Error ? error.stack || error.message : String(error)));
    }
  }

  public debug(message: string, meta?: unknown): void {
    if (this.verboseEnabled) {
      console.log(`${colors.dim('[DEBUG]')} ${colors.dim(message)}`, meta ? colors.dim(JSON.stringify(meta)) : '');
    }
  }
}

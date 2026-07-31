import { pino, type Logger } from 'pino';

export const logger: Logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type ServerLogger = Logger;

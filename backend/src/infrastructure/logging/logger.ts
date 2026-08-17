export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  userId?: string;
  orderId?: string;
  listingId?: string;
  [key: string]: unknown;
}

export class Logger {
  private scope: string;

  constructor(scope = 'App') {
    this.scope = scope;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level: level.toUpperCase(),
      scope: this.scope,
      message,
      ...(context || {}),
    };
    return JSON.stringify(payload);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'test') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context));
  }
}

export const logger = new Logger('Server');

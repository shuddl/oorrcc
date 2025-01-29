type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  private constructor() {
    // Initialize logger
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In production, send logs to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Implement log shipping here
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    const entry = this.formatMessage('debug', message, context);
    this.addLog(entry);
    if (process.env.NODE_ENV !== 'production') {
      console.debug(message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    const entry = this.formatMessage('info', message, context);
    this.addLog(entry);
    if (process.env.NODE_ENV !== 'production') {
      console.info(message, context);
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    const entry = this.formatMessage('warn', message, context);
    this.addLog(entry);
    console.warn(message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    const entry = this.formatMessage('error', message, context);
    this.addLog(entry);
    console.error(message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
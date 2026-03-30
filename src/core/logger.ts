export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export type Logger = {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export function createLogger(options?: {
  format?: 'text' | 'json';
  write?: (line: string) => void;
}): Logger {
  const format = options?.format ?? 'text';
  const write = options?.write ?? console.log;

  const emit = (entry: LogEntry) => {
    if (format === 'json') {
      write(JSON.stringify(entry));
      return;
    }

    const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
    write(`[${entry.level.toUpperCase()}] ${entry.message}${meta}`);
  };

  return {
    log(level, message, meta) {
      emit({
        level,
        message,
        timestamp: new Date().toISOString(),
        meta
      });
    },
    debug(message, meta) {
      emit({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        meta
      });
    },
    info(message, meta) {
      emit({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        meta
      });
    },
    warn(message, meta) {
      emit({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        meta
      });
    },
    error(message, meta) {
      emit({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        meta
      });
    }
  };
}

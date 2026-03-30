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
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}): Logger {
  const format = options?.format ?? 'text';
  const stdout = options?.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  const stderr = options?.stderr ?? ((line: string) => process.stderr.write(`${line}\n`));

  const emit = (entry: LogEntry) => {
    const line =
      format === 'json'
        ? JSON.stringify(entry)
        : `[${entry.level.toUpperCase()}] ${entry.message}${entry.meta ? ` ${JSON.stringify(entry.meta)}` : ''}`;

    const write = entry.level === 'warn' || entry.level === 'error' ? stderr : stdout;
    write(line);
  };

  const now = () => new Date().toISOString();

  return {
    log(level, message, meta) {
      emit({
        level,
        message,
        timestamp: now(),
        meta
      });
    },
    debug(message, meta) {
      emit({
        level: 'debug',
        message,
        timestamp: now(),
        meta
      });
    },
    info(message, meta) {
      emit({
        level: 'info',
        message,
        timestamp: now(),
        meta
      });
    },
    warn(message, meta) {
      emit({
        level: 'warn',
        message,
        timestamp: now(),
        meta
      });
    },
    error(message, meta) {
      emit({
        level: 'error',
        message,
        timestamp: now(),
        meta
      });
    }
  };
}

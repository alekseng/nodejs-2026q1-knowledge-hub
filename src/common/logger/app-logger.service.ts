import { ConsoleLogger, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = 'logs';
const LOG_FILE = 'app.log';

export class AppLoggerService extends ConsoleLogger {
  private readonly logFilePath: string;
  private readonly maxFileSizeBytes: number;
  private readonly isProduction: boolean;

  constructor() {
    const level = (process.env.LOG_LEVEL || 'log') as LogLevel;
    const levels: LogLevel[] = AppLoggerService.buildLevels(level);
    super('App', { logLevels: levels });

    this.maxFileSizeBytes =
      parseInt(process.env.LOG_MAX_FILE_SIZE || '1024', 10) * 1024;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logFilePath = path.join(LOG_DIR, LOG_FILE);
    this.ensureLogDir();
  }

  log(message: any, context?: string) {
    this.writeToFile('log', message, context);
    super.log(message, context);
  }

  error(message: any, stack?: string, context?: string) {
    this.writeToFile('error', message, context, stack);
    super.error(message, stack, context);
  }

  warn(message: any, context?: string) {
    this.writeToFile('warn', message, context);
    super.warn(message, context);
  }

  debug(message: any, context?: string) {
    this.writeToFile('debug', message, context);
    super.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.writeToFile('verbose', message, context);
    super.verbose(message, context);
  }

  private writeToFile(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ) {
    try {
      this.rotateIfNeeded();
      const line = this.isProduction
        ? this.formatJson(level, message, context, stack)
        : this.formatHuman(level, message, context, stack);
      fs.appendFileSync(this.logFilePath, line + '\n', 'utf8');
    } catch {
      // file logging must never crash the app
    }
  }

  private formatJson(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ): string {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? this.context,
      message: String(message),
    };
    if (stack) entry.stack = stack;
    return JSON.stringify(entry);
  }

  private formatHuman(
    level: string,
    message: any,
    context?: string,
    stack?: string,
  ): string {
    const ts = new Date().toISOString();
    const ctx = context ?? this.context ?? '';
    const base = `[${ts}] [${level.toUpperCase().padEnd(7)}] [${ctx}] ${message}`;
    return stack ? `${base}\n${stack}` : base;
  }

  private rotateIfNeeded() {
    if (!fs.existsSync(this.logFilePath)) return;
    const { size } = fs.statSync(this.logFilePath);
    if (size < this.maxFileSizeBytes) return;

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const rotatedPath = path.join(LOG_DIR, `app-${timestamp}.log`);
    fs.renameSync(this.logFilePath, rotatedPath);
  }

  private ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  private static buildLevels(level: LogLevel): LogLevel[] {
    const order: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error'];
    const idx = order.indexOf(level);
    return idx === -1 ? ['log', 'warn', 'error'] : order.slice(idx);
  }
}

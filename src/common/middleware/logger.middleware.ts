import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'authorization',
]);

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k) ? '[REDACTED]' : sanitize(v),
    ]),
  );
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, query, body } = request;
    const start = Date.now();

    const queryStr =
      Object.keys(query).length ? JSON.stringify(query) : undefined;
    const bodyStr =
      body && Object.keys(body).length
        ? JSON.stringify(sanitize(body))
        : undefined;

    const parts = [`→ ${method} ${originalUrl}`];
    if (queryStr) parts.push(`query: ${queryStr}`);
    if (bodyStr) parts.push(`body: ${bodyStr}`);
    this.logger.log(parts.join(' | '));

    response.on('finish', () => {
      const { statusCode } = response;
      const ms = Date.now() - start;
      this.logger.log(`← ${method} ${originalUrl} ${statusCode} ${ms}ms`);
    });

    next();
  }
}

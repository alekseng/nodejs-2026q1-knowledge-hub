import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = 500;
    let message: string = 'An unexpected error occurred';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : (body.message ?? message);
        error = body.error ?? exception.name;
      }
    } else if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
      error = exception.name;
    }

    const stack =
      exception instanceof Error ? exception.stack : String(exception);

    this.logger.error(
      `${request.method} ${request.url} → ${statusCode}`,
      stack,
    );

    response.status(statusCode).json(
      statusCode === 500
        ? {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          }
        : { statusCode, error, message },
    );
  }
}

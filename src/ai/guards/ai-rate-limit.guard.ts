import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly rpm: number;

  constructor(private readonly configService: ConfigService) {
    this.rpm = this.configService.get<number>('AI_RATE_LIMIT_RPM', 20);
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const ip: string = (request.ip as string) ?? '0.0.0.0';
    const now = Date.now();
    const windowStart = now - 60_000;

    const timestamps = (this.requests.get(ip) ?? []).filter(
      (t) => t > windowStart,
    );

    if (timestamps.length >= this.rpm) {
      const retryAfter = Math.ceil((timestamps[0] + 60_000 - now) / 1000);
      response.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }
}

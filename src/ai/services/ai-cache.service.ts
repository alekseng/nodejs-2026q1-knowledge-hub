import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AiCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = this.configService.get<number>('AI_CACHE_TTL_SEC', 300);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds ?? this.defaultTtl) * 1000;
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  buildKey(...parts: string[]): string {
    return parts.join(':');
  }
}

import { Injectable } from '@nestjs/common';

interface LatencyBucket {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

export interface UsageStats {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  totalTokens: number;
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
  };
  latency: Record<
    string,
    { count: number; avgMs: number; minMs: number; maxMs: number }
  >;
}

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly byEndpoint: Record<string, number> = {};
  private totalTokens = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly latencyBuckets: Record<string, LatencyBucket> = {};

  track(endpoint: string, tokens = 0): void {
    this.totalRequests++;
    this.byEndpoint[endpoint] = (this.byEndpoint[endpoint] ?? 0) + 1;
    this.totalTokens += tokens;
  }

  trackLatency(endpoint: string, ms: number): void {
    if (!this.latencyBuckets[endpoint]) {
      this.latencyBuckets[endpoint] = {
        count: 0,
        totalMs: 0,
        minMs: Infinity,
        maxMs: 0,
      };
    }
    const b = this.latencyBuckets[endpoint];
    b.count++;
    b.totalMs += ms;
    b.minMs = Math.min(b.minMs, ms);
    b.maxMs = Math.max(b.maxMs, ms);
  }

  trackCache(hit: boolean): void {
    if (hit) this.cacheHits++;
    else this.cacheMisses++;
  }

  getStats(): UsageStats {
    const total = this.cacheHits + this.cacheMisses;
    const latency: UsageStats['latency'] = {};
    for (const [endpoint, b] of Object.entries(this.latencyBuckets)) {
      latency[endpoint] = {
        count: b.count,
        avgMs: b.count > 0 ? Math.round(b.totalMs / b.count) : 0,
        minMs: b.minMs === Infinity ? 0 : b.minMs,
        maxMs: b.maxMs,
      };
    }
    return {
      totalRequests: this.totalRequests,
      byEndpoint: { ...this.byEndpoint },
      totalTokens: this.totalTokens,
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatio:
          total > 0 ? Math.round((this.cacheHits / total) * 100) / 100 : 0,
      },
      latency,
    };
  }
}

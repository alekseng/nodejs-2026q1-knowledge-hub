import { Injectable } from '@nestjs/common';

export interface UsageStats {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  totalTokens: number;
}

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly byEndpoint: Record<string, number> = {};
  private totalTokens = 0;

  track(endpoint: string, tokens = 0): void {
    this.totalRequests++;
    this.byEndpoint[endpoint] = (this.byEndpoint[endpoint] ?? 0) + 1;
    this.totalTokens += tokens;
  }

  getStats(): UsageStats {
    return {
      totalRequests: this.totalRequests,
      byEndpoint: { ...this.byEndpoint },
      totalTokens: this.totalTokens,
    };
  }
}

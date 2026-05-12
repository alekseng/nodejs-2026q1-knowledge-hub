import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../../common/errors';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason: string;
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

export interface GeminiResult {
  text: string;
  totalTokens: number;
}

interface EmbeddingResponse {
  embedding?: { values?: number[] };
}

const RETRY_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'GEMINI_API_BASE_URL',
      'https://generativelanguage.googleapis.com',
    );
    this.model = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );
    this.embeddingModel = this.configService.get<string>(
      'GEMINI_EMBEDDING_MODEL',
      'text-embedding-004',
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
    const body = JSON.stringify({
      model: `models/${this.embeddingModel}`,
      content: { parts: [{ text }] },
    });

    let lastError: AppError = new AppError(
      503,
      'AI service is temporarily unavailable',
    );

    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.status === 401 || response.status === 403) {
          this.logger.error('Gemini embedding API authentication failed');
          throw new AppError(500, 'AI service configuration error');
        }

        if (response.status === 429) {
          if (attempt < RETRY_ATTEMPTS - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          lastError = new AppError(
            503,
            'AI service rate limit exceeded. Please try again later.',
          );
          break;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          this.logger.error(
            `Gemini embedding HTTP ${response.status}: ${body.slice(0, 300)}`,
          );
          if (attempt < RETRY_ATTEMPTS - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          lastError = new AppError(
            503,
            'AI service is temporarily unavailable',
          );
          break;
        }

        const data = (await response.json()) as EmbeddingResponse;
        return data.embedding?.values ?? [];
      } catch (error) {
        if (error instanceof AppError) throw error;

        const isAbort =
          error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'TimeoutError');

        lastError = isAbort
          ? new AppError(503, 'AI service request timed out')
          : new AppError(503, 'AI service is temporarily unavailable');

        if (attempt < RETRY_ATTEMPTS - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  generate(prompt: string): Promise<GeminiResult> {
    return this.callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
  }

  generateWithHistory(
    history: GeminiMessage[],
    prompt: string,
  ): Promise<GeminiResult> {
    return this.callGemini([
      ...history,
      { role: 'user', parts: [{ text: prompt }] },
    ]);
  }

  private async callGemini(contents: GeminiMessage[]): Promise<GeminiResult> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = JSON.stringify({ contents });

    let lastError: AppError = new AppError(
      503,
      'AI service is temporarily unavailable',
    );

    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.status === 401 || response.status === 403) {
          this.logger.error('Gemini API authentication failed');
          throw new AppError(500, 'AI service configuration error');
        }

        if (response.status === 429) {
          if (attempt < RETRY_ATTEMPTS - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          lastError = new AppError(
            503,
            'AI service rate limit exceeded. Please try again later.',
          );
          break;
        }

        if (!response.ok) {
          if (attempt < RETRY_ATTEMPTS - 1) {
            await sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          lastError = new AppError(
            503,
            'AI service is temporarily unavailable',
          );
          break;
        }

        const data = (await response.json()) as GeminiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const totalTokens = data.usageMetadata?.totalTokenCount ?? 0;

        return { text, totalTokens };
      } catch (error) {
        if (error instanceof AppError) throw error;

        const isAbort =
          error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'TimeoutError');

        lastError = isAbort
          ? new AppError(503, 'AI service request timed out')
          : new AppError(503, 'AI service is temporarily unavailable');

        if (attempt < RETRY_ATTEMPTS - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }
}

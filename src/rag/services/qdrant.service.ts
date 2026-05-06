import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { createHash } from 'crypto';
import { AppError } from '../../common/errors';

export interface ChunkPayload {
  articleId: string;
  articleTitle: string;
  chunk: string;
  chunkIndex: number;
  status: string;
  categoryId?: string;
  tags?: string[];
  contentHash: string;
}

export interface ChunkPoint {
  payload: ChunkPayload;
  vector: number[];
}

export interface SearchFilter {
  articleStatus?: string;
  categoryId?: string;
  tags?: string[];
}

export interface SearchResult {
  payload: ChunkPayload;
  similarity: number;
}

const VECTOR_SIZE = 768;

function chunkPointId(articleId: string, chunkIndex: number): string {
  const hash = createHash('sha256')
    .update(`${articleId}:${chunkIndex}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;
  private readonly collection: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>(
      'RAG_VECTOR_DB_URL',
      'http://localhost:6333',
    );
    this.collection = this.configService.get<string>(
      'RAG_VECTOR_COLLECTION',
      'knowledge_hub_articles',
    );
    this.client = new QdrantClient({ url });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const exists = await this.client.collectionExists(this.collection);
      if (!exists.exists) {
        await this.client.createCollection(this.collection, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Created Qdrant collection: ${this.collection}`);
      }
    } catch (error) {
      this.logger.error('Failed to connect to vector DB', {
        error: String(error),
      });
      throw new AppError(503, 'Vector database is unavailable');
    }
  }

  getCollectionName(): string {
    return this.collection;
  }

  async upsertChunks(points: ChunkPoint[]): Promise<void> {
    if (!points.length) return;
    try {
      await this.client.upsert(this.collection, {
        wait: true,
        points: points.map((p) => ({
          id: chunkPointId(p.payload.articleId, p.payload.chunkIndex),
          vector: p.vector,
          payload: p.payload as unknown as Record<string, unknown>,
        })),
      });
    } catch (error) {
      this.logger.error('Failed to upsert chunks into vector DB', {
        error: String(error),
      });
      throw new AppError(503, 'Vector database is unavailable');
    }
  }

  async deleteByArticleId(articleId: string): Promise<number> {
    try {
      const result = await this.client.delete(this.collection, {
        wait: true,
        filter: {
          must: [{ key: 'articleId', match: { value: articleId } }],
        },
      });
      void result;
      return 0;
    } catch (error) {
      this.logger.error('Failed to delete article vectors', {
        error: String(error),
      });
      throw new AppError(503, 'Vector database is unavailable');
    }
  }

  async search(
    vector: number[],
    limit: number,
    filter?: SearchFilter,
  ): Promise<SearchResult[]> {
    const must: object[] = [];

    if (filter?.articleStatus) {
      must.push({ key: 'status', match: { value: filter.articleStatus } });
    }
    if (filter?.categoryId) {
      must.push({ key: 'categoryId', match: { value: filter.categoryId } });
    }
    if (filter?.tags?.length) {
      must.push({ key: 'tags', match: { any: filter.tags } });
    }

    try {
      const results = await this.client.search(this.collection, {
        vector,
        limit,
        with_payload: true,
        ...(must.length ? { filter: { must } } : {}),
      });

      return results.map((r) => ({
        payload: r.payload as unknown as ChunkPayload,
        similarity: r.score,
      }));
    } catch (error) {
      this.logger.error('Failed to search vector DB', { error: String(error) });
      throw new AppError(503, 'Vector database is unavailable');
    }
  }

  async getIndexedArticleHashes(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let offset: string | number | null = null;

    try {
      do {
        const response = await this.client.scroll(this.collection, {
          limit: 256,
          with_payload: ['articleId', 'contentHash'],
          ...(offset !== null ? { offset } : {}),
        });

        for (const point of response.points) {
          const p = point.payload as unknown as Partial<ChunkPayload>;
          if (p.articleId && p.contentHash) {
            map.set(p.articleId, p.contentHash);
          }
        }

        const next = response.next_page_offset;
        offset =
          typeof next === 'string' || typeof next === 'number' ? next : null;
      } while (offset !== null);
    } catch (error) {
      this.logger.warn('Could not fetch indexed article hashes', {
        error: String(error),
      });
    }

    return map;
  }
}

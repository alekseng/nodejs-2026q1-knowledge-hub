import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { GeminiService } from '../../ai/services/gemini.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReindexRequestDto } from '../dto/reindex-request.dto';
import { ReindexResponseDto } from '../dto/reindex-response.dto';
import { ChunkingService } from './chunking.service';
import { QdrantService } from './qdrant.service';

function articleContentHash(title: string, content: string): string {
  return createHash('sha256').update(`${title}\n\n${content}`).digest('hex');
}

@Injectable()
export class RagIndexService {
  private readonly logger = new Logger(RagIndexService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunking: ChunkingService,
    private readonly qdrant: QdrantService,
    private readonly gemini: GeminiService,
  ) {}

  async index(dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    const onlyPublished = dto.onlyPublished !== false;

    const articles = await this.prisma.article.findMany({
      where: {
        ...(dto.articleIds?.length ? { id: { in: dto.articleIds } } : {}),
        ...(onlyPublished ? { status: 'published' } : {}),
      },
      include: { tags: true },
    });

    const existingHashes = await this.qdrant.getIndexedArticleHashes();

    let indexedArticles = 0;
    let indexedChunks = 0;

    for (const article of articles) {
      const hash = articleContentHash(article.title, article.content);

      if (existingHashes.get(article.id) === hash) {
        this.logger.debug(`Skipping unchanged article: ${article.id}`);
        continue;
      }

      await this.qdrant.deleteByArticleId(article.id);

      const text = `${article.title}\n\n${article.content}`;
      const chunks = this.chunking.chunk(text);

      const points = [];
      for (const chunk of chunks) {
        const vector = await this.gemini.generateEmbedding(chunk.text);
        points.push({
          vector,
          payload: {
            articleId: article.id,
            articleTitle: article.title,
            chunk: chunk.text,
            chunkIndex: chunk.index,
            status: article.status as string,
            categoryId: article.categoryId ?? undefined,
            tags: article.tags.map((t) => t.name),
            contentHash: hash,
          },
        });
      }

      await this.qdrant.upsertChunks(points);
      indexedArticles++;
      indexedChunks += chunks.length;
      this.logger.log(`Indexed article ${article.id}: ${chunks.length} chunks`);
    }

    return {
      indexedArticles,
      indexedChunks,
      vectorCollection: this.qdrant.getCollectionName(),
    };
  }

  async deleteArticle(articleId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }

    const hashes = await this.qdrant.getIndexedArticleHashes();
    if (!hashes.has(articleId)) {
      throw new NotFoundException(
        `No index entries found for article ${articleId}`,
      );
    }

    await this.qdrant.deleteByArticleId(articleId);
  }
}

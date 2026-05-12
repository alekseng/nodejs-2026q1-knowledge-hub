import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../ai/services/gemini.service';
import { RagSearchRequestDto } from '../dto/rag-search-request.dto';
import {
  RagSearchResponseDto,
  RagSearchResultDto,
} from '../dto/rag-search-response.dto';
import { QdrantService, SearchResult } from './qdrant.service';

const SEMANTIC_WEIGHT = 0.7;
const LEXICAL_WEIGHT = 0.3;

function lexicalScore(text: string, query: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (!terms.length) return 0;

  const lower = text.toLowerCase();
  const hits = terms.filter((t) => lower.includes(t)).length;
  return hits / terms.length;
}

@Injectable()
export class RagSearchService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly qdrant: QdrantService,
  ) {}

  async search(dto: RagSearchRequestDto): Promise<RagSearchResponseDto> {
    const limit = dto.limit ?? 5;
    const candidateLimit = Math.min(limit * 3, 60);

    const vector = await this.gemini.generateEmbedding(dto.query);

    const semanticResults = await this.qdrant.search(vector, candidateLimit, {
      articleStatus: dto.articleStatus,
      categoryId: dto.categoryId,
      tags: dto.tags,
    });

    const results = this.hybridRank(semanticResults, dto.query, limit);

    return { results };
  }

  private hybridRank(
    semanticResults: SearchResult[],
    query: string,
    limit: number,
  ): RagSearchResultDto[] {
    const scored = semanticResults.map((r) => {
      const lex = lexicalScore(r.payload.chunk, query);
      const hybrid = SEMANTIC_WEIGHT * r.similarity + LEXICAL_WEIGHT * lex;
      return { r, hybrid };
    });

    scored.sort((a, b) => b.hybrid - a.hybrid);

    return scored.slice(0, limit).map(({ r, hybrid }) => ({
      articleId: r.payload.articleId,
      articleTitle: r.payload.articleTitle,
      chunk: r.payload.chunk,
      similarity: Math.round(hybrid * 10000) / 10000,
    }));
  }
}

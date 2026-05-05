import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TextChunk {
  text: string;
  index: number;
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('RAG_CHUNK_SIZE', 800);
    this.chunkOverlap = this.configService.get<number>(
      'RAG_CHUNK_OVERLAP',
      200,
    );
  }

  chunk(text: string): TextChunk[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const step = Math.max(1, this.chunkSize - this.chunkOverlap);
    const chunks: TextChunk[] = [];

    for (let i = 0; i < normalized.length; i += step) {
      chunks.push({
        text: normalized.slice(i, i + this.chunkSize),
        index: chunks.length,
      });
      if (i + this.chunkSize >= normalized.length) break;
    }

    return chunks;
  }
}

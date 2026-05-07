import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RagController } from './rag.controller';
import { ChunkingService } from './services/chunking.service';
import { QdrantService } from './services/qdrant.service';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';

@Module({
  imports: [AiModule],
  controllers: [RagController],
  providers: [
    ChunkingService,
    QdrantService,
    RagIndexService,
    RagSearchService,
  ],
})
export class RagModule {}

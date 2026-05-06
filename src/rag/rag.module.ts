import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RagController } from './rag.controller';
import { ChunkingService } from './services/chunking.service';
import { QdrantService } from './services/qdrant.service';

@Module({
  imports: [AiModule],
  controllers: [RagController],
  providers: [ChunkingService, QdrantService],
})
export class RagModule {}

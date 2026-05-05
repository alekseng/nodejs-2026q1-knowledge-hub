import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { ChunkingService } from './services/chunking.service';

@Module({
  controllers: [RagController],
  providers: [ChunkingService],
})
export class RagModule {}

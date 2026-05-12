import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from './services/gemini.service';
import { AiCacheService } from './services/ai-cache.service';
import { AiUsageService } from './services/ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { ConversationService } from './services/conversation.service';

@Module({
  controllers: [AiController],
  providers: [
    GeminiService,
    AiCacheService,
    AiUsageService,
    AiRateLimitGuard,
    ConversationService,
  ],
  exports: [GeminiService],
})
export class AiModule {}

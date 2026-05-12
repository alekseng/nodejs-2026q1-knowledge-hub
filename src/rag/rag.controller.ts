import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { RagChatRequestDto } from './dto/rag-chat-request.dto';
import { RagSearchRequestDto } from './dto/rag-search-request.dto';
import { ReindexRequestDto } from './dto/reindex-request.dto';
import { RagChatService } from './services/rag-chat.service';
import { RagConversationService } from './services/rag-conversation.service';
import { RagIndexService } from './services/rag-index.service';
import { RagSearchService } from './services/rag-search.service';

@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly ragIndex: RagIndexService,
    private readonly ragSearch: RagSearchService,
    private readonly ragChat: RagChatService,
    private readonly ragConversation: RagConversationService,
  ) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  index(@Body() dto: ReindexRequestDto) {
    return this.ragIndex.index(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() dto: RagSearchRequestDto) {
    return this.ragSearch.search(dto);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@Body() dto: RagChatRequestDto) {
    return this.ragChat.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticleIndex(@Param('articleId') articleId: string) {
    await this.ragIndex.deleteArticle(articleId);
  }

  @Get('chat/:conversationId/history')
  getHistory(@Param('conversationId') conversationId: string) {
    return { messages: this.ragConversation.getHistory(conversationId) };
  }
}

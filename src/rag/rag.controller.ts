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
import { RagIndexService } from './services/rag-index.service';

@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragIndex: RagIndexService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  index(@Body() dto: ReindexRequestDto) {
    return this.ragIndex.index(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() _dto: RagSearchRequestDto) {
    return { results: [] };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@Body() _dto: RagChatRequestDto) {
    return { answer: '', sources: [], conversationId: '' };
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticleIndex(@Param('articleId') articleId: string) {
    await this.ragIndex.deleteArticle(articleId);
  }

  @Get('chat/:conversationId/history')
  getHistory(@Param('conversationId') _conversationId: string) {
    return { messages: [] };
  }
}

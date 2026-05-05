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

@Controller('ai/rag')
export class RagController {
  @Post('index')
  @HttpCode(HttpStatus.OK)
  index(@Body() _dto: ReindexRequestDto) {
    return { indexedArticles: 0, indexedChunks: 0, vectorCollection: '' };
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
  deleteArticleIndex(@Param('articleId') _articleId: string) {
    return;
  }

  @Get('chat/:conversationId/history')
  getHistory(@Param('conversationId') _conversationId: string) {
    return { messages: [] };
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleStatus } from './article.interface';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  findAll(
    @Query('status') status?: ArticleStatus,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
  ) {
    return this.articleService.findAll(status, categoryId, tag);
  }

  @Post()
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }
}

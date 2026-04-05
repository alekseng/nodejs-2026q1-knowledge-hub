import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({ status: 200, description: 'All article records' })
  findAll(@Query() pagination?: PaginationDto) {
    return this.articleService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single article by id' })
  @ApiResponse({ status: 200, description: 'The record found' })
  @ApiBadRequestResponse({ description: 'ArticleId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.articleService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new article' })
  @ApiResponse({ status: 201, description: 'Newly created record' })
  @ApiBadRequestResponse({
    description: 'Request body does not contain required fields',
  })
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articleService.create(createArticleDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update article info' })
  @ApiResponse({ status: 200, description: 'Updated record' })
  @ApiBadRequestResponse({ description: 'ArticleId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articleService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete article' })
  @ApiNoContentResponse({ description: 'The record is found and deleted' })
  @ApiBadRequestResponse({ description: 'ArticleId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.articleService.remove(id);
  }
}

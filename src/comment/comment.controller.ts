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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentPaginationDto } from './dto/comment-pagination.dto';

@ApiTags('comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all comments for an article' })
  @ApiResponse({
    status: 200,
    description: 'All comment records for the given article',
  })
  @ApiBadRequestResponse({
    description: 'ArticleId is required and must be uuid',
  })
  findAll(@Query() pagination: CommentPaginationDto) {
    return this.commentService.findAllByArticleId(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single comment by id' })
  @ApiResponse({ status: 200, description: 'The record found' })
  @ApiBadRequestResponse({ description: 'CommentId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.commentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new comment' })
  @ApiResponse({ status: 201, description: 'Newly created record' })
  @ApiBadRequestResponse({ description: 'Required fields are missing' })
  @ApiUnprocessableEntityResponse({
    description: "Referenced articleId doesn't exist",
  })
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(createCommentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment' })
  @ApiNoContentResponse({ description: 'The record is found and deleted' })
  @ApiBadRequestResponse({ description: 'CommentId is invalid (not uuid)' })
  @ApiNotFoundResponse({ description: 'Record not found' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.commentService.remove(id);
  }
}

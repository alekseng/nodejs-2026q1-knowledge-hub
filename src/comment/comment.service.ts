import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Comment } from './comment.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ArticleService } from '../article/article.service';

@Injectable()
export class CommentService {
  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) {}
  private comments: Comment[] = [];

  create(createCommentDto: CreateCommentDto) {
    try {
      this.articleService.findOne(createCommentDto.articleId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new UnprocessableEntityException(
          `Article with id ${createCommentDto.articleId} does not exist`,
        );
      }
      throw e;
    }

    const newComment: Comment = {
      id: randomUUID(),
      ...createCommentDto,
      authorId: createCommentDto.authorId || null,
      createdAt: Date.now(),
    };
    this.comments.push(newComment);
    return newComment;
  }

  findAllByArticleId(articleId: string) {
    return this.comments.filter((c) => c.articleId === articleId);
  }

  findOne(id: string) {
    const comment = this.comments.find((c) => c.id === id);
    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
    return comment;
  }

  remove(id: string) {
    const index = this.comments.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
    this.comments.splice(index, 1);
  }

  removeByArticleId(articleId: string) {
    this.comments = this.comments.filter((c) => c.articleId !== articleId);
  }

  removeByAuthorId(authorId: string) {
    this.comments = this.comments.filter((c) => c.authorId !== authorId);
  }
}

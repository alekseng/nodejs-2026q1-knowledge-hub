import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Comment } from './comment.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ArticleService } from '../article/article.service';

@Injectable()
export class CommentService {
  constructor(private readonly articleService: ArticleService) {}
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
}

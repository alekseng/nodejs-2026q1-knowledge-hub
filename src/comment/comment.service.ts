import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Comment } from './comment.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentPaginationDto } from './dto/comment-pagination.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const { articleId, content, authorId } = createCommentDto;

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article) {
      throw new UnprocessableEntityException(
        `Article with id ${articleId} does not exist`,
      );
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        articleId,
        authorId: authorId ?? null,
      },
    });

    return this.mapToComment(comment);
  }

  async findAllByArticleId(
    pagination: CommentPaginationDto,
  ): Promise<PaginatedResult<Comment> | Comment[]> {
    const {
      articleId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'ASC',
    } = pagination;

    const where = { articleId };
    const total = await this.prisma.comment.count({ where });

    if (pagination.page || pagination.limit) {
      const comments = await this.prisma.comment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order.toLowerCase() as 'asc' | 'desc',
        },
      });

      return {
        total,
        page,
        limit,
        data: comments.map((c) => this.mapToComment(c)),
      };
    }

    const comments = await this.prisma.comment.findMany({ where });
    return comments.map((c) => this.mapToComment(c));
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
    return this.mapToComment(comment);
  }

  async remove(id: string, user: any): Promise<void> {
    const commentToDelete = await this.findOne(id);

    if (user.role !== Role.admin && commentToDelete.authorId !== user.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    try {
      await this.prisma.comment.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }
  }
  private mapToComment(comment: any): Comment {
    return {
      ...comment,
      createdAt: comment.createdAt.getTime(),
    };
  }
}

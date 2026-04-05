import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CommentService } from '../comment/comment.service';
import { Article, ArticleStatus } from './article.interface';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}
  private articles: Article[] = [];

  findAll(pagination?: PaginationDto): PaginatedResult<Article> | Article[] {
    let result = [...this.articles];

    if (pagination?.status) {
      result = result.filter((a) => a.status === pagination.status);
    }
    if (pagination?.categoryId) {
      result = result.filter((a) => a.categoryId === pagination.categoryId);
    }
    if (pagination?.tag) {
      result = result.filter((a) => a.tags.includes(pagination.tag));
    }

    if (pagination?.page || pagination?.limit) {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'ASC',
      } = pagination;

      if (sortBy) {
        result.sort((a, b) => {
          const valA = a[sortBy as keyof Article];
          const valB = b[sortBy as keyof Article];
          if (valA < valB) return order === 'ASC' ? -1 : 1;
          if (valA > valB) return order === 'ASC' ? 1 : -1;
          return 0;
        });
      }

      const total = result.length;
      const startIndex = (page - 1) * limit;
      const data = result.slice(startIndex, startIndex + limit);

      return {
        total,
        page,
        limit,
        data,
      };
    }

    return result;
  }

  findOne(id: string) {
    const article = this.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    return article;
  }

  create(createArticleDto: CreateArticleDto) {
    const now = Date.now();
    const newArticle: Article = {
      id: randomUUID(),
      ...createArticleDto,
      status: createArticleDto.status || ArticleStatus.DRAFT,
      authorId: createArticleDto.authorId || null,
      categoryId: createArticleDto.categoryId || null,
      tags: createArticleDto.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    this.articles.push(newArticle);
    return newArticle;
  }

  update(id: string, updateArticleDto: UpdateArticleDto) {
    const article = this.findOne(id);

    if (updateArticleDto.title !== undefined)
      article.title = updateArticleDto.title;
    if (updateArticleDto.content !== undefined)
      article.content = updateArticleDto.content;
    if (updateArticleDto.status !== undefined)
      article.status = updateArticleDto.status;
    if (updateArticleDto.authorId !== undefined)
      article.authorId = updateArticleDto.authorId;
    if (updateArticleDto.categoryId !== undefined)
      article.categoryId = updateArticleDto.categoryId;
    if (updateArticleDto.tags !== undefined)
      article.tags = updateArticleDto.tags;

    article.updatedAt = Date.now();
    return article;
  }

  remove(id: string) {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    this.articles.splice(index, 1);
    this.commentService.removeByArticleId(id);
  }

  clearAuthorId(userId: string) {
    this.articles.forEach((a) => {
      if (a.authorId === userId) a.authorId = null;
    });
  }

  clearCategoryId(categoryId: string) {
    this.articles.forEach((a) => {
      if (a.categoryId === categoryId) a.categoryId = null;
    });
  }
}

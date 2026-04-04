import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Article, ArticleStatus } from './article.interface';
import { CreateArticleDto } from './dto/create-article.dto';

@Injectable()
export class ArticleService {
  private articles: Article[] = [];

  findAll(status?: ArticleStatus, categoryId?: string, tag?: string) {
    let result = this.articles;

    if (status) {
      result = result.filter((a) => a.status === status);
    }
    if (categoryId) {
      result = result.filter((a) => a.categoryId === categoryId);
    }
    if (tag) {
      result = result.filter((a) => a.tags.includes(tag));
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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Article, ArticleStatus } from './article.interface';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

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

import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../common/errors';
import { Role, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Article, ArticleStatus } from './article.interface';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<Article> | Article[]> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'ASC',
      status,
      categoryId,
      tag,
    } = pagination || {};

    const where: any = {};
    if (status) where.status = status as Status;
    if (categoryId) where.categoryId = categoryId;
    if (tag) {
      where.tags = {
        some: {
          name: tag,
        },
      };
    }

    const total = await this.prisma.article.count({ where });

    if (pagination?.page || pagination?.limit) {
      const articles = await this.prisma.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order.toLowerCase() as 'asc' | 'desc',
        },
        include: {
          tags: true,
        },
      });

      return {
        total,
        page,
        limit,
        data: articles.map((a) => this.mapToArticle(a)),
      };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: {
        tags: true,
      },
    });
    return articles.map((a) => this.mapToArticle(a));
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!article) {
      throw new NotFoundError(`Article with id ${id} not found`);
    }
    return this.mapToArticle(article);
  }

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    const { tags, ...data } = createArticleDto;

    const article = await this.prisma.article.create({
      data: {
        ...data,
        status: (createArticleDto.status || ArticleStatus.DRAFT) as Status,
        tags: {
          connectOrCreate: tags?.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      },
      include: { tags: true },
    });

    return this.mapToArticle(article);
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    user: any,
  ): Promise<Article> {
    const articleToUpdate = await this.findOne(id);

    if (user.role !== Role.admin && articleToUpdate.authorId !== user.userId) {
      throw new ForbiddenError('You can only update your own articles');
    }

    const { tags, ...data } = updateArticleDto;

    try {
      const updateData: any = { ...data };
      if (tags) {
        updateData.tags = {
          set: [],
          connectOrCreate: tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        };
      }
      if (updateArticleDto.status) {
        updateData.status = updateArticleDto.status as Status;
      }

      const article = await this.prisma.article.update({
        where: { id },
        data: updateData,
        include: { tags: true },
      });

      return this.mapToArticle(article);
    } catch (error) {
      throw new NotFoundError(`Article with id ${id} not found`);
    }
  }

  async remove(id: string, user: any): Promise<void> {
    const articleToDelete = await this.findOne(id);

    if (user.role !== Role.admin && articleToDelete.authorId !== user.userId) {
      throw new ForbiddenError('You can only delete your own articles');
    }

    try {
      await this.prisma.article.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError(`Article with id ${id} not found`);
    }
  }

  private mapToArticle(prismaArticle: any): Article {
    return {
      ...prismaArticle,
      tags: prismaArticle.tags?.map((t: any) => t.name) || [],
      createdAt: prismaArticle.createdAt.getTime(),
      updatedAt: prismaArticle.updatedAt.getTime(),
    };
  }
}

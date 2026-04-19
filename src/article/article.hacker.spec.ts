import { Test, TestingModule } from '@nestjs/testing';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommentService } from '../comment/comment.service';
import { ArticleService } from './article.service';

describe('ArticleService (Hacker Scope)', () => {
  let service: ArticleService;
  let prisma: PrismaService;

  const mockArticles = Array.from({ length: 15 }, (_, i) => ({
    id: `id${i}`,
    title: `Article ${i}`,
    content: 'Content',
    status: Status.draft,
    authorId: null,
    categoryId: null,
    createdAt: new Date(1000 + i),
    updatedAt: new Date(1000 + i),
    tags: [],
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: PrismaService,
          useValue: {
            article: {
              count: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: CommentService,
          useValue: { removeByArticleId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should paginate results', async () => {
    jest.spyOn(prisma.article, 'count').mockResolvedValue(15);
    jest
      .spyOn(prisma.article, 'findMany')
      .mockResolvedValue(mockArticles.slice(5, 10));

    const result = (await service.findAll({
      page: 2,
      limit: 5,
    })) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].title).toBe('Article 5');
  });

  it('should sort results by title DESC', async () => {
    const customArticles = [
      { title: 'C', createdAt: new Date(), updatedAt: new Date() },
      { title: 'B', createdAt: new Date(), updatedAt: new Date() },
      { title: 'A', createdAt: new Date(), updatedAt: new Date() },
    ].map((a, i) => ({
      ...a,
      id: `id${i}`,
      content: 'C',
      status: Status.draft,
      authorId: 'authorId',
      categoryId: 'categoryId',
    }));

    jest.spyOn(prisma.article, 'count').mockResolvedValue(3);
    jest.spyOn(prisma.article, 'findMany').mockResolvedValue(customArticles);

    const result = (await service.findAll({
      sortBy: 'title',
      order: 'DESC',
      page: 1,
      limit: 10,
    })) as any;

    expect(result.data[0].title).toBe('C');
    expect(result.data[1].title).toBe('B');
    expect(result.data[2].title).toBe('A');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleService } from '../article/article.service';
import { CommentService } from './comment.service';

describe('CommentService (Hacker Scope)', () => {
  let service: CommentService;
  let prisma: PrismaService;
  const articleId = '550e8400-e29b-41d4-a716-446655440002';

  const mockComments = Array.from({ length: 15 }, (_, i) => ({
    id: `id${i}`,
    content: `Comment ${i}`,
    articleId: articleId,
    authorId: 'authorId',
    createdAt: new Date(1000 + i),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: {
            comment: {
              count: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            article: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ArticleService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should paginate results for a specific article', async () => {
    jest.spyOn(prisma.comment, 'count').mockResolvedValue(15);
    jest
      .spyOn(prisma.comment, 'findMany')
      .mockResolvedValue(mockComments.slice(5, 10));

    const result = (await service.findAllByArticleId({
      articleId,
      page: 2,
      limit: 5,
    })) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].content).toBe('Comment 5');
  });

  it('should sort results by content DESC', async () => {
    const customComments = [
      { content: 'C', createdAt: new Date() },
      { content: 'B', createdAt: new Date() },
      { content: 'A', createdAt: new Date() },
    ].map((c, i) => ({
      ...c,
      id: `id${i}`,
      articleId,
      authorId: 'authorId',
    }));

    jest.spyOn(prisma.comment, 'count').mockResolvedValue(3);
    jest.spyOn(prisma.comment, 'findMany').mockResolvedValue(customComments);

    const result = (await service.findAllByArticleId({
      articleId,
      sortBy: 'content',
      order: 'DESC',
      page: 1,
      limit: 10,
    })) as any;

    expect(result.data[0].content).toBe('C');
    expect(result.data[1].content).toBe('B');
    expect(result.data[2].content).toBe('A');
  });
});

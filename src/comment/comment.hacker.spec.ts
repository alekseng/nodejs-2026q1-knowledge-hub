import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from '../article/article.service';
import { CommentService } from './comment.service';

describe('CommentService (Hacker Scope)', () => {
  let service: CommentService;
  const articleId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: ArticleService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  it('should paginate results for a specific article', () => {
    for (let i = 0; i < 15; i++) {
      service.create({
        content: `Comment ${i}`,
        articleId: articleId,
      });
    }

    const result = service.findAllByArticleId({
      articleId,
      page: 2,
      limit: 5,
    }) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].content).toBe('Comment 5');
  });

  it('should sort results by content DESC', () => {
    service.create({ content: 'A', articleId });
    service.create({ content: 'C', articleId });
    service.create({ content: 'B', articleId });

    const result = service.findAllByArticleId({
      articleId,
      sortBy: 'content',
      order: 'DESC',
      page: 1,
      limit: 10,
    }) as any;

    expect(result.data[0].content).toBe('C');
    expect(result.data[1].content).toBe('B');
    expect(result.data[2].content).toBe('A');
  });
});

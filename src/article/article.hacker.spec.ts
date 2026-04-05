import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from '../comment/comment.service';
import { ArticleService } from './article.service';

describe('ArticleService (Hacker Scope)', () => {
  let service: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: CommentService,
          useValue: { removeByArticleId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should paginate results', () => {
    for (let i = 0; i < 15; i++) {
      service.create({
        title: `Article ${i}`,
        content: 'Content',
        tags: [],
      });
    }

    const result = service.findAll({
      page: 2,
      limit: 5,
    }) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].title).toBe('Article 5');
  });

  it('should sort results by title DESC', () => {
    service.create({ title: 'A', content: 'C', tags: [] });
    service.create({ title: 'C', content: 'C', tags: [] });
    service.create({ title: 'B', content: 'C', tags: [] });

    const result = service.findAll({
      sortBy: 'title',
      order: 'DESC',
      page: 1,
      limit: 10,
    }) as any;

    expect(result.data[0].title).toBe('C');
    expect(result.data[1].title).toBe('B');
    expect(result.data[2].title).toBe('A');
  });
});

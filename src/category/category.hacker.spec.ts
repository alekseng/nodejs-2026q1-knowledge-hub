import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from '../article/article.service';
import { CategoryService } from './category.service';

describe('CategoryService (Hacker Scope)', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: ArticleService,
          useValue: { clearCategoryId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should paginate results', () => {
    for (let i = 0; i < 15; i++) {
      service.create({
        name: `Category ${String(i).padStart(2, '0')}`,
        description: 'Description',
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
    expect(result.data[0].name).toBe('Category 05');
  });

  it('should sort results by name DESC', () => {
    service.create({ name: 'A', description: 'D' });
    service.create({ name: 'C', description: 'D' });
    service.create({ name: 'B', description: 'D' });

    const result = service.findAll({
      sortBy: 'name',
      order: 'DESC',
      page: 1,
      limit: 10,
    }) as any;

    expect(result.data[0].name).toBe('C');
    expect(result.data[1].name).toBe('B');
    expect(result.data[2].name).toBe('A');
  });
});

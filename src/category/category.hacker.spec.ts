import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleService } from '../article/article.service';
import { CategoryService } from './category.service';

describe('CategoryService (Hacker Scope)', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  const mockCategories = Array.from({ length: 15 }, (_, i) => ({
    id: `id${i}`,
    name: `Category ${String(i).padStart(2, '0')}`,
    description: 'Description',
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              count: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: ArticleService,
          useValue: { clearCategoryId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should paginate results', async () => {
    jest.spyOn(prisma.category, 'count').mockResolvedValue(15);
    jest
      .spyOn(prisma.category, 'findMany')
      .mockResolvedValue(mockCategories.slice(5, 10));

    const result = (await service.findAll({
      page: 2,
      limit: 5,
    })) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].name).toBe('Category 05');
  });

  it('should sort results by name DESC', async () => {
    const customCategories = [
      { name: 'C', description: 'D' },
      { name: 'B', description: 'D' },
      { name: 'A', description: 'D' },
    ].map((c, i) => ({ ...c, id: `id${i}` }));

    jest.spyOn(prisma.category, 'count').mockResolvedValue(3);
    jest.spyOn(prisma.category, 'findMany').mockResolvedValue(customCategories);

    const result = (await service.findAll({
      sortBy: 'name',
      order: 'DESC',
      page: 1,
      limit: 10,
    })) as any;

    expect(result.data[0].name).toBe('C');
    expect(result.data[1].name).toBe('B');
    expect(result.data[2].name).toBe('A');
  });
});

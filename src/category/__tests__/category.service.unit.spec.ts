import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from '../category.service';
import { PrismaService } from '../../prisma/prisma.service';

const makeCategory = (overrides: Record<string, any> = {}) => ({
  id: 'cat-uuid-1',
  name: 'Technology',
  description: 'Tech articles',
  ...overrides,
});

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      category: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns plain array when no pagination params given', async () => {
      prisma.category.count.mockResolvedValue(2);
      prisma.category.findMany.mockResolvedValue([
        makeCategory(),
        makeCategory({ id: 'cat-uuid-2' }),
      ]);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
    });

    it('returns paginated result when page is provided', async () => {
      prisma.category.count.mockResolvedValue(10);
      prisma.category.findMany.mockResolvedValue([makeCategory()]);

      const result = (await service.findAll({
        page: 2,
        limit: 5,
      } as any)) as any;

      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCategory());

      const result = await service.findOne('cat-uuid-1');

      expect(result.id).toBe('cat-uuid-1');
      expect(result.name).toBe('Technology');
    });

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns new category', async () => {
      const dto = { name: 'Science', description: 'Science stuff' };
      prisma.category.create.mockResolvedValue(makeCategory({ ...dto }));

      const result = await service.create(dto);

      expect(prisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result.name).toBe('Science');
    });
  });

  describe('update', () => {
    it('updates and returns category', async () => {
      prisma.category.update.mockResolvedValue(
        makeCategory({ name: 'Updated' }),
      );

      const result = await service.update('cat-uuid-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.update.mockRejectedValue(new Error('Record not found'));

      await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes category successfully', async () => {
      prisma.category.delete.mockResolvedValue({});

      await expect(service.remove('cat-uuid-1')).resolves.toBeUndefined();
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-uuid-1' },
      });
    });

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});

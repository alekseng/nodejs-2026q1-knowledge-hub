import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArticleService } from '../article.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ArticleStatus } from '../article.interface';
import { Role, Status } from '@prisma/client';

const makeArticle = (overrides: Record<string, any> = {}) => ({
  id: 'art-uuid-1',
  title: 'Test Article',
  content: 'Content here',
  status: Status.draft,
  authorId: 'user-uuid-1',
  categoryId: null,
  tags: [{ name: 'nestjs' }, { name: 'typescript' }],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  ...overrides,
});

const adminUser = { userId: 'admin-uuid', role: Role.admin };
const editorUser = { userId: 'user-uuid-1', role: Role.editor };
const otherUser = { userId: 'other-uuid', role: Role.editor };

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      article: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns plain array when no pagination params given', async () => {
      prisma.article.count.mockResolvedValue(2);
      prisma.article.findMany.mockResolvedValue([
        makeArticle(),
        makeArticle({ id: 'art-uuid-2' }),
      ]);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
    });

    it('maps tags to array of strings', async () => {
      prisma.article.count.mockResolvedValue(1);
      prisma.article.findMany.mockResolvedValue([makeArticle()]);

      const result = (await service.findAll()) as any[];
      expect(result[0].tags).toEqual(['nestjs', 'typescript']);
    });

    it('returns paginated result when page is provided', async () => {
      prisma.article.count.mockResolvedValue(5);
      prisma.article.findMany.mockResolvedValue([makeArticle()]);

      const result = (await service.findAll({
        page: 1,
        limit: 2,
      } as any)) as any;

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('filters by status when provided', async () => {
      prisma.article.count.mockResolvedValue(1);
      prisma.article.findMany.mockResolvedValue([
        makeArticle({ status: Status.published }),
      ]);

      await service.findAll({ status: 'published' } as any);

      expect(prisma.article.count).toHaveBeenCalledWith({
        where: { status: 'published' },
      });
    });

    it('filters by categoryId when provided', async () => {
      prisma.article.count.mockResolvedValue(1);
      prisma.article.findMany.mockResolvedValue([makeArticle()]);

      await service.findAll({ categoryId: 'cat-uuid' } as any);

      expect(prisma.article.count).toHaveBeenCalledWith({
        where: { categoryId: 'cat-uuid' },
      });
    });

    it('filters by tag when provided', async () => {
      prisma.article.count.mockResolvedValue(1);
      prisma.article.findMany.mockResolvedValue([makeArticle()]);

      await service.findAll({ tag: 'nestjs' } as any);

      expect(prisma.article.count).toHaveBeenCalledWith({
        where: { tags: { some: { name: 'nestjs' } } },
      });
    });
  });

  describe('findOne', () => {
    it('returns article when found', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());

      const result = await service.findOne('art-uuid-1');

      expect(result.id).toBe('art-uuid-1');
      expect(result.tags).toEqual(['nestjs', 'typescript']);
    });

    it('throws NotFoundException when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates article with DRAFT status by default', async () => {
      prisma.article.create.mockResolvedValue(makeArticle());

      await service.create({ title: 'T', content: 'C' } as any);

      const callData = prisma.article.create.mock.calls[0][0].data;
      expect(callData.status).toBe(ArticleStatus.DRAFT);
    });

    it('uses provided status', async () => {
      prisma.article.create.mockResolvedValue(
        makeArticle({ status: Status.published }),
      );

      await service.create({
        title: 'T',
        content: 'C',
        status: ArticleStatus.PUBLISHED,
      } as any);

      const callData = prisma.article.create.mock.calls[0][0].data;
      expect(callData.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('creates tags with connectOrCreate', async () => {
      prisma.article.create.mockResolvedValue(makeArticle());

      await service.create({
        title: 'T',
        content: 'C',
        tags: ['nestjs', 'node'],
      } as any);

      const callData = prisma.article.create.mock.calls[0][0].data;
      expect(callData.tags.connectOrCreate).toHaveLength(2);
      expect(callData.tags.connectOrCreate[0].where).toEqual({
        name: 'nestjs',
      });
    });

    it('returns article with tags as string array', async () => {
      prisma.article.create.mockResolvedValue(makeArticle());

      const result = await service.create({ title: 'T', content: 'C' } as any);

      expect(result.tags).toEqual(['nestjs', 'typescript']);
    });

    it('converts timestamps to milliseconds', async () => {
      prisma.article.create.mockResolvedValue(makeArticle());

      const result = await service.create({ title: 'T', content: 'C' } as any);

      expect(typeof result.createdAt).toBe('number');
      expect(typeof result.updatedAt).toBe('number');
    });
  });

  describe('update', () => {
    it('allows admin to update any article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: 'other-uuid' }),
      );
      prisma.article.update.mockResolvedValue(
        makeArticle({ title: 'Updated' }),
      );

      const result = await service.update(
        'art-uuid-1',
        { title: 'Updated' } as any,
        adminUser,
      );

      expect(result.title).toBe('Updated');
    });

    it('allows author to update their own article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: editorUser.userId }),
      );
      prisma.article.update.mockResolvedValue(makeArticle({ title: 'Mine' }));

      const result = await service.update(
        'art-uuid-1',
        { title: 'Mine' } as any,
        editorUser,
      );

      expect(result.title).toBe('Mine');
    });

    it('throws ForbiddenException when non-admin tries to update another user article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: 'someone-else' }),
      );

      await expect(
        service.update('art-uuid-1', { title: 'Hack' } as any, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('bad-id', { title: 'X' } as any, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('resets and reconnects tags on update', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: editorUser.userId }),
      );
      prisma.article.update.mockResolvedValue(
        makeArticle({ tags: [{ name: 'new-tag' }] }),
      );

      await service.update(
        'art-uuid-1',
        { tags: ['new-tag'] } as any,
        editorUser,
      );

      const callData = prisma.article.update.mock.calls[0][0].data;
      expect(callData.tags.set).toEqual([]);
      expect(callData.tags.connectOrCreate[0].where).toEqual({
        name: 'new-tag',
      });
    });

    it('handles status transitions — draft to published', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: editorUser.userId, status: Status.draft }),
      );
      prisma.article.update.mockResolvedValue(
        makeArticle({ status: Status.published }),
      );

      await service.update(
        'art-uuid-1',
        { status: ArticleStatus.PUBLISHED } as any,
        editorUser,
      );

      const callData = prisma.article.update.mock.calls[0][0].data;
      expect(callData.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('handles status transitions — published to archived', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: editorUser.userId, status: Status.published }),
      );
      prisma.article.update.mockResolvedValue(
        makeArticle({ status: Status.archived }),
      );

      await service.update(
        'art-uuid-1',
        { status: ArticleStatus.ARCHIVED } as any,
        editorUser,
      );

      const callData = prisma.article.update.mock.calls[0][0].data;
      expect(callData.status).toBe(ArticleStatus.ARCHIVED);
    });
  });

  describe('remove', () => {
    it('allows admin to delete any article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: 'someone-else' }),
      );
      prisma.article.delete.mockResolvedValue({});

      await expect(
        service.remove('art-uuid-1', adminUser),
      ).resolves.toBeUndefined();
    });

    it('allows author to delete their own article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: editorUser.userId }),
      );
      prisma.article.delete.mockResolvedValue({});

      await expect(
        service.remove('art-uuid-1', editorUser),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when non-admin tries to delete another user article', async () => {
      prisma.article.findUnique.mockResolvedValue(
        makeArticle({ authorId: 'someone-else' }),
      );

      await expect(service.remove('art-uuid-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(service.remove('bad-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

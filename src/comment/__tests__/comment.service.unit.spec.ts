import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommentService } from '../comment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

const makeComment = (overrides: Record<string, any> = {}) => ({
  id: 'comment-uuid-1',
  content: 'Great article!',
  articleId: 'art-uuid-1',
  authorId: 'user-uuid-1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const adminUser = { userId: 'admin-uuid', role: Role.admin };
const authorUser = { userId: 'user-uuid-1', role: Role.editor };
const otherUser = { userId: 'other-uuid', role: Role.editor };

describe('CommentService', () => {
  let service: CommentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      article: {
        findUnique: vi.fn(),
      },
      comment: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CommentService>(CommentService);
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates comment when article exists', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-uuid-1' });
      prisma.comment.create.mockResolvedValue(makeComment());

      const result = await service.create({
        content: 'Great article!',
        articleId: 'art-uuid-1',
        authorId: 'user-uuid-1',
      });

      expect(result.content).toBe('Great article!');
      expect(typeof result.createdAt).toBe('number');
    });

    it('throws UnprocessableEntityException when article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          content: 'Hi',
          articleId: 'bad-art-id',
          authorId: 'u1',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('sets authorId to null when not provided', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-uuid-1' });
      prisma.comment.create.mockResolvedValue(makeComment({ authorId: null }));

      await service.create({
        content: 'Anonymous',
        articleId: 'art-uuid-1',
      } as any);

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorId: null }),
        }),
      );
    });

    it('converts createdAt to milliseconds', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'art-uuid-1' });
      prisma.comment.create.mockResolvedValue(makeComment());

      const result = await service.create({
        content: 'Hi',
        articleId: 'art-uuid-1',
        authorId: 'u1',
      });

      expect(typeof result.createdAt).toBe('number');
    });
  });

  describe('findAllByArticleId', () => {
    it('returns plain array when no pagination params given', async () => {
      prisma.comment.count.mockResolvedValue(2);
      prisma.comment.findMany.mockResolvedValue([
        makeComment(),
        makeComment({ id: 'c2' }),
      ]);

      const result = await service.findAllByArticleId({
        articleId: 'art-uuid-1',
      } as any);

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
    });

    it('returns paginated result when page is provided', async () => {
      prisma.comment.count.mockResolvedValue(5);
      prisma.comment.findMany.mockResolvedValue([makeComment()]);

      const result = (await service.findAllByArticleId({
        articleId: 'art-uuid-1',
        page: 1,
        limit: 2,
      } as any)) as any;

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns comment when found', async () => {
      prisma.comment.findUnique.mockResolvedValue(makeComment());

      const result = await service.findOne('comment-uuid-1');

      expect(result.id).toBe('comment-uuid-1');
    });

    it('throws NotFoundException when comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('allows admin to delete any comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeComment({ authorId: 'someone-else' }),
      );
      prisma.comment.delete.mockResolvedValue({});

      await expect(
        service.remove('comment-uuid-1', adminUser),
      ).resolves.toBeUndefined();
    });

    it('allows author to delete their own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeComment({ authorId: authorUser.userId }),
      );
      prisma.comment.delete.mockResolvedValue({});

      await expect(
        service.remove('comment-uuid-1', authorUser),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when non-admin tries to delete another user comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(
        makeComment({ authorId: 'someone-else' }),
      );

      await expect(service.remove('comment-uuid-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when comment does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('bad-id', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

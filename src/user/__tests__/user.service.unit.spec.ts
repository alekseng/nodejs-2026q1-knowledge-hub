import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors';
import { UserRole } from '../user.interface';
import { Role } from '@prisma/client';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const makeUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-uuid-1',
  login: 'testuser',
  password: 'hashed-password',
  role: Role.viewer,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      article: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(async (fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns a plain array when no pagination params given', async () => {
      const users = [
        makeUser(),
        makeUser({ id: 'user-uuid-2', login: 'second' }),
      ];
      prisma.user.count.mockResolvedValue(2);
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
    });

    it('strips password from all returned users', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([makeUser()]);

      const result = (await service.findAll()) as any[];
      expect(result[0].password).toBeUndefined();
    });

    it('returns paginated result when page is provided', async () => {
      const users = [makeUser()];
      prisma.user.count.mockResolvedValue(5);
      prisma.user.findMany.mockResolvedValue(users);

      const result = (await service.findAll({
        page: 1,
        limit: 3,
      } as any)) as any;

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('strips password in paginated result', async () => {
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([makeUser()]);

      const result = (await service.findAll({
        page: 1,
        limit: 10,
      } as any)) as any;
      expect(result.data[0].password).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('user-uuid-1');
      expect(result.id).toBe('user-uuid-1');
      expect(result.login).toBe('testuser');
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('findOneResponse', () => {
    it('returns user without password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findOneResponse('user-uuid-1');
      expect(result.password).toBeUndefined();
    });
  });

  describe('create', () => {
    it('hashes the password before saving', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed-pw');
      prisma.user.create.mockResolvedValue(makeUser({ password: 'hashed-pw' }));

      await service.create({ login: 'newuser', password: 'plain-pw' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-pw', expect.any(Number));
    });

    it('assigns VIEWER role by default', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(makeUser());

      await service.create({ login: 'newuser', password: 'pw' } as any);

      const callData = prisma.user.create.mock.calls[0][0].data;
      expect(callData.role).toBe(UserRole.VIEWER);
    });

    it('uses provided role when specified', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(makeUser({ role: Role.admin }));

      await service.create({
        login: 'admin',
        password: 'pw',
        role: Role.admin,
      } as any);

      const callData = prisma.user.create.mock.calls[0][0].data;
      expect(callData.role).toBe(Role.admin);
    });

    it('throws BadRequestException when login is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.create({ login: 'testuser', password: 'pw' } as any),
      ).rejects.toThrow(ValidationError);
    });

    it('returns user without password field', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(makeUser());

      const result = await service.create({
        login: 'newuser',
        password: 'pw',
      } as any);
      expect(result.password).toBeUndefined();
    });
  });

  describe('findByLogin', () => {
    it('returns user when login matches', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByLogin('testuser');
      expect(result?.login).toBe('testuser');
    });

    it('returns null when login not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByLogin('ghost');
      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('updates password when old password is correct', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('new-hashed');
      prisma.user.update.mockResolvedValue(
        makeUser({ password: 'new-hashed' }),
      );

      const result = await service.updatePassword('user-uuid-1', {
        oldPassword: 'old-pw',
        newPassword: 'new-pw',
      });
      expect(result.password).toBeUndefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('new-pw', expect.any(Number));
    });

    it('throws ForbiddenException when old password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        service.updatePassword('user-uuid-1', {
          oldPassword: 'wrong',
          newPassword: 'new',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('bad-id', {
          oldPassword: 'x',
          newPassword: 'y',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('nullifies articles and deletes user in a transaction', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.article.updateMany.mockResolvedValue({ count: 2 });
      prisma.user.delete.mockResolvedValue(makeUser());

      await service.remove('user-uuid-1');

      expect(prisma.article.updateMany).toHaveBeenCalledWith({
        where: { authorId: 'user-uuid-1' },
        data: { authorId: null },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundError);
    });
  });
});

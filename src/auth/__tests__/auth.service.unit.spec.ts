import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
}));

const USER = {
  id: 'user-uuid-1',
  login: 'alice',
  password: 'hashed-pw',
  role: Role.editor,
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let jwtService: any;
  let prisma: any;

  beforeEach(async () => {
    userService = {
      create: vi.fn(),
      findByLogin: vi.fn(),
    };

    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };

    prisma = {
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('delegates to UserService.create', async () => {
      const dto = { login: 'alice', password: 'pw' };
      userService.create.mockResolvedValue({ id: 'u1', login: 'alice' });

      const result = await service.signup(dto as any);

      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'u1', login: 'alice' });
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      userService.findByLogin.mockResolvedValue(USER);
      (bcrypt.compare as any).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ login: 'alice', password: 'pw' });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws ForbiddenException when user not found', async () => {
      userService.findByLogin.mockResolvedValue(null);

      await expect(
        service.login({ login: 'ghost', password: 'pw' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when password is wrong', async () => {
      userService.findByLogin.mockResolvedValue(USER);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(
        service.login({ login: 'alice', password: 'wrong' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('stores refresh token in database', async () => {
      userService.findByLogin.mockResolvedValue(USER);
      (bcrypt.compare as any).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('acc')
        .mockResolvedValueOnce('ref');
      prisma.refreshToken.create.mockResolvedValue({});

      await service.login({ login: 'alice', password: 'pw' });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { token: 'ref', userId: USER.id },
      });
    });
  });

  describe('refresh', () => {
    it('returns new tokens when refresh token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        userId: USER.id,
        login: USER.login,
        role: USER.role,
      });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'valid-refresh',
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'valid-refresh' });

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('throws UnauthorizedException when refreshToken is missing', async () => {
      await expect(
        service.refresh({ refreshToken: undefined }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when token is expired or invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when token not found in DB (invalidated)', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        userId: USER.id,
        login: USER.login,
        role: USER.role,
      });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'orphan-token' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rotates refresh token — deletes old, creates new', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        userId: USER.id,
        login: USER.login,
        role: USER.role,
      });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'old-refresh',
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      jwtService.signAsync
        .mockResolvedValueOnce('acc2')
        .mockResolvedValueOnce('ref2');
      prisma.refreshToken.create.mockResolvedValue({});

      await service.refresh({ refreshToken: 'old-refresh' });

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'old-refresh' },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { token: 'ref2', userId: USER.id },
      });
    });
  });

  describe('logout', () => {
    it('deletes refresh token from DB', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({});

      await service.logout({ refreshToken: 'token-to-delete' });

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'token-to-delete' },
      });
    });

    it('does nothing when refreshToken is absent', async () => {
      await service.logout({ refreshToken: undefined });

      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('generateTokens', () => {
    it('signs access token with JWT_SECRET', async () => {
      userService.findByLogin.mockResolvedValue(USER);
      (bcrypt.compare as any).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('acc')
        .mockResolvedValueOnce('ref');
      prisma.refreshToken.create.mockResolvedValue({});

      await service.login({ login: 'alice', password: 'pw' });

      const firstCall = jwtService.signAsync.mock.calls[0];
      expect(firstCall[0]).toEqual({
        userId: USER.id,
        login: USER.login,
        role: USER.role,
      });
      expect(firstCall[1].secret).toBe(process.env.JWT_SECRET);
    });

    it('signs refresh token with JWT_REFRESH_SECRET', async () => {
      userService.findByLogin.mockResolvedValue(USER);
      (bcrypt.compare as any).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce('acc')
        .mockResolvedValueOnce('ref');
      prisma.refreshToken.create.mockResolvedValue({});

      await service.login({ login: 'alice', password: 'pw' });

      const secondCall = jwtService.signAsync.mock.calls[1];
      expect(secondCall[1].secret).toBe(process.env.JWT_REFRESH_SECRET);
    });
  });
});

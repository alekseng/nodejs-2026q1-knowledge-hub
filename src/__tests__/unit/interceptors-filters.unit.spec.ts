import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed'),
  compare: vi.fn(),
}));

const makeUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-uuid-1',
  login: 'alice',
  password: 'hashed-password',
  role: Role.viewer,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  ...overrides,
});

describe('Response transformation — password stripping', () => {
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
      article: { updateMany: vi.fn() },
      $transaction: vi.fn(async (fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
    vi.clearAllMocks();
  });

  it('findOne response does not contain password field', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const result = await service.findOneResponse('user-uuid-1');
    expect(result).not.toHaveProperty('password');
  });

  it('create response does not contain password field', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(makeUser());
    const result = await service.create({
      login: 'newuser',
      password: 'pw',
    } as any);
    expect(result).not.toHaveProperty('password');
  });

  it('updatePassword response does not contain password field', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    (bcrypt.compare as any).mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(makeUser({ password: 'new-hash' }));
    const result = await service.updatePassword('user-uuid-1', {
      oldPassword: 'old',
      newPassword: 'new',
    });
    expect(result).not.toHaveProperty('password');
  });

  it('findAll list response does not contain password in any item', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.user.findMany.mockResolvedValue([
      makeUser(),
      makeUser({ id: 'u2', login: 'bob' }),
    ]);
    const result = (await service.findAll()) as any[];
    result.forEach((u) => expect(u).not.toHaveProperty('password'));
  });

  it('findAll paginated response does not contain password in data items', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([makeUser()]);
    const result = (await service.findAll({
      page: 1,
      limit: 10,
    } as any)) as any;
    result.data.forEach((u: any) => expect(u).not.toHaveProperty('password'));
  });

  it('timestamps in response are numbers (milliseconds), not Date objects', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const result = await service.findOneResponse('user-uuid-1');
    expect(typeof result.createdAt).toBe('number');
    expect(typeof result.updatedAt).toBe('number');
  });
});

describe('Exception shapes', () => {
  it('NotFoundException has status 404', () => {
    const ex = new NotFoundException('User with id x not found');
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((ex.getResponse() as any).message).toContain(
      'User with id x not found',
    );
  });

  it('BadRequestException has status 400', () => {
    const ex = new BadRequestException('Login is already taken');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('ForbiddenException has status 403', () => {
    const ex = new ForbiddenException('Authentication failed');
    expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('UnauthorizedException has status 401', () => {
    const ex = new UnauthorizedException('Authentication token is missing');
    expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('UnprocessableEntityException has status 422', () => {
    const ex = new UnprocessableEntityException('Article does not exist');
    expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('HttpException response includes error message', () => {
    const ex = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
    expect(ex.getStatus()).toBe(400);
    expect(ex.message).toBe('Custom error');
  });
});

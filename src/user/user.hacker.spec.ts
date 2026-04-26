import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { UserService } from './user.service';

describe('UserService (Hacker Scope)', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockUsers = Array.from({ length: 15 }, (_, i) => ({
    id: `id${i}`,
    login: `User${i}`,
    password: 'password',
    role: Role.viewer,
    createdAt: new Date(1000 + i),
    updatedAt: new Date(1000 + i),
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
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
          useValue: { clearAuthorId: jest.fn() },
        },
        {
          provide: CommentService,
          useValue: { removeByAuthorId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should paginate results', async () => {
    jest.spyOn(prisma.user, 'count').mockResolvedValue(15);
    jest
      .spyOn(prisma.user, 'findMany')
      .mockResolvedValue(mockUsers.slice(5, 10));

    const result = (await service.findAll({
      page: 2,
      limit: 5,
    })) as any;

    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data.length).toBe(5);
    expect(result.data[0].login).toBe('User5');
  });

  it('should sort results by login DESC', async () => {
    const customUsers = [
      { login: 'C', createdAt: new Date(), updatedAt: new Date() },
      { login: 'B', createdAt: new Date(), updatedAt: new Date() },
      { login: 'A', createdAt: new Date(), updatedAt: new Date() },
    ].map((u, i) => ({
      ...u,
      id: `id${i}`,
      password: 'p',
      role: Role.viewer,
    }));

    jest.spyOn(prisma.user, 'count').mockResolvedValue(3);
    jest.spyOn(prisma.user, 'findMany').mockResolvedValue(customUsers);

    const result = (await service.findAll({
      sortBy: 'login',
      order: 'DESC',
      page: 1,
      limit: 10,
    })) as any;

    expect(result.data[0].login).toBe('C');
    expect(result.data[1].login).toBe('B');
    expect(result.data[2].login).toBe('A');
  });
});

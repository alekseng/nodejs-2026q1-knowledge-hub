import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { UserService } from './user.service';

describe('UserService (Hacker Scope)', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
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
  });

  it('should paginate results', () => {
    for (let i = 0; i < 15; i++) {
      service.create({
        login: `User${i}`,
        password: 'password',
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
    expect((result.data[0] as any).login).toBe('User5');
  });

  it('should sort results by login DESC', () => {
    service.create({ login: 'A', password: 'p' });
    service.create({ login: 'C', password: 'p' });
    service.create({ login: 'B', password: 'p' });

    const result = service.findAll({
      sortBy: 'login',
      order: 'DESC',
      page: 1,
      limit: 10,
    }) as any;

    expect((result.data[0] as any).login).toBe('C');
    expect((result.data[1] as any).login).toBe('B');
    expect((result.data[2] as any).login).toBe('A');
  });
});

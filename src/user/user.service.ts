import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { User, UserRole } from './user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) {}
  private users: User[] = [];

  findAll(
    pagination?: PaginationDto,
  ): PaginatedResult<Partial<User>> | Partial<User>[] {
    const result = [...this.users];

    if (pagination?.page || pagination?.limit) {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'ASC',
      } = pagination;

      if (sortBy) {
        result.sort((a, b) => {
          const valA = a[sortBy as keyof User];
          const valB = b[sortBy as keyof User];
          if (valA < valB) return order === 'ASC' ? -1 : 1;
          if (valA > valB) return order === 'ASC' ? 1 : -1;
          return 0;
        });
      }

      const total = result.length;
      const startIndex = (page - 1) * limit;
      const data = result
        .slice(startIndex, startIndex + limit)
        .map((user) => this.toResponse(user));

      return {
        total,
        page,
        limit,
        data,
      };
    }

    return this.users.map((user) => this.toResponse(user));
  }

  findOne(id: string) {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  findOneResponse(id: string) {
    return this.toResponse(this.findOne(id));
  }

  create(createUserDto: CreateUserDto) {
    const now = Date.now();
    const newUser: User = {
      id: randomUUID(),
      ...createUserDto,
      role: createUserDto.role || UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(newUser);
    return this.toResponse(newUser);
  }

  updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    const user = this.findOne(id);
    if (user.password !== updatePasswordDto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }
    user.password = updatePasswordDto.newPassword;
    user.updatedAt = Date.now();
    return this.toResponse(user);
  }

  remove(id: string) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    this.users.splice(index, 1);
    this.articleService.clearAuthorId(id);
    this.commentService.removeByAuthorId(id);
  }

  private toResponse(user: User) {
    const result = { ...user };
    delete (result as any).password;
    return result;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { User, UserRole } from './user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination?: PaginationDto,
  ): Promise<PaginatedResult<any> | any[]> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'ASC',
    } = pagination || {};

    const total = await this.prisma.user.count();

    if (pagination?.page || pagination?.limit) {
      const users = await this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order.toLowerCase(),
        },
      });

      return {
        total,
        page,
        limit,
        data: users.map((user) => this.toResponse(user as unknown as User)),
      };
    }

    const users = await this.prisma.user.findMany();
    return users.map((user) => this.toResponse(user as unknown as User));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user as unknown as User;
  }

  async findOneResponse(id: string) {
    return this.toResponse(await this.findOne(id));
  }

  async create(createUserDto: CreateUserDto) {
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        role: (createUserDto.role || UserRole.VIEWER) as Role,
      },
    });
    return this.toResponse(newUser as unknown as User);
  }

  async updatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.findOne(id);
    if (user.password !== updatePasswordDto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: updatePasswordDto.newPassword,
      },
    });

    return this.toResponse(updatedUser as unknown as User);
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  private toResponse(user: User) {
    const result = {
      ...user,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
    delete (result as any).password;
    return result;
  }
}

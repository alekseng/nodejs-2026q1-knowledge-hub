import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User, UserRole } from './user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class UserService {
  private users: User[] = [];

  findAll() {
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
  }

  private toResponse(user: User) {
    const { password, ...result } = user;
    return result;
  }
}

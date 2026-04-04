import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User, UserRole } from './user.interface';
import { CreateUserDto } from './dto/create-user.dto';

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
    return this.toResponse(user);
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

  private toResponse(user: User) {
    const { password, ...result } = user;
    return result;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './user.interface';

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

  private toResponse(user: User) {
    const { password, ...result } = user;
    return result;
  }
}

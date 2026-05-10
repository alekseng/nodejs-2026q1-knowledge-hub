import { Injectable } from '@nestjs/common';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(signupDto: SignupDto) {
    return this.userService.create(signupDto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByLogin(loginDto.login);

    if (!user) {
      throw new ForbiddenError('Authentication failed');
    }

    const isPasswordMatching = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatching) {
      throw new ForbiddenError('Authentication failed');
    }

    return this.generateTokens(user.id, user.login, user.role);
  }

  async refresh(refreshDto: RefreshDto) {
    if (!refreshDto.refreshToken) {
      throw new UnauthorizedError('Refresh token is missing');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new ForbiddenError('Refresh token is invalid or expired');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshDto.refreshToken },
    });
    if (!tokenRecord) {
      throw new ForbiddenError('Refresh token has been invalidated');
    }

    await this.prisma.refreshToken.delete({
      where: { token: refreshDto.refreshToken },
    });

    return this.generateTokens(payload.userId, payload.login, payload.role);
  }

  async logout(logoutDto: LogoutDto): Promise<void> {
    if (!logoutDto.refreshToken) {
      return;
    }
    await this.prisma.refreshToken.deleteMany({
      where: { token: logoutDto.refreshToken },
    });
  }

  private async generateTokens(userId: string, login: string, role: string) {
    const payload = { userId, login, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_TTL,
      }),
    ]);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId },
    });

    return { accessToken, refreshToken };
  }
}

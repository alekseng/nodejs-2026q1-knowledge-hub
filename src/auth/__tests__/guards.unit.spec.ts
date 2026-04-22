import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

const makeContext = (opts: {
  headers?: Record<string, string>;
  user?: any;
  method?: string;
  handler?: object;
  cls?: object;
}) => {
  const request = {
    headers: opts.headers ?? {},
    user: opts.user ?? undefined,
    method: opts.method ?? 'GET',
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => opts.handler ?? {},
    getClass: () => opts.cls ?? {},
    _request: request,
  } as any;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: any;
  let reflector: any;
  const originalEnv = process.env.TEST_MODE;

  beforeEach(() => {
    jwtService = { verifyAsync: vi.fn() };
    reflector = { getAllAndOverride: vi.fn() };
    guard = new JwtAuthGuard(jwtService, reflector);
  });

  afterEach(() => {
    process.env.TEST_MODE = originalEnv;
  });

  describe('public routes', () => {
    it('returns true immediately for @Public() endpoints', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = makeContext({});

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('non-auth TEST_MODE (default)', () => {
    beforeEach(() => {
      process.env.TEST_MODE = '';
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('returns true even without a token', async () => {
      const ctx = makeContext({ headers: {} });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('sets request.user when valid token is provided', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        userId: 'u1',
        role: Role.editor,
      });
      const ctx = makeContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      await guard.canActivate(ctx);

      expect(ctx._request.user).toEqual({ userId: 'u1', role: Role.editor });
    });

    it('still returns true when token is invalid (no throw)', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      const ctx = makeContext({
        headers: { authorization: 'Bearer bad-token' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('ignores non-Bearer authorization scheme', async () => {
      const ctx = makeContext({ headers: { authorization: 'Basic abc123' } });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('TEST_MODE=auth (strict)', () => {
    beforeEach(() => {
      process.env.TEST_MODE = 'auth';
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('throws UnauthorizedException when token is missing', async () => {
      const ctx = makeContext({ headers: {} });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
      const ctx = makeContext({
        headers: { authorization: 'Bearer bad-token' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token is expired', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      const ctx = makeContext({
        headers: { authorization: 'Bearer expired-token' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns true and sets user for valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        userId: 'u1',
        role: Role.admin,
      });
      const ctx = makeContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(ctx._request.user).toEqual({ userId: 'u1', role: Role.admin });
    });
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector);
  });

  const setup = (opts: {
    isPublic?: boolean;
    requiredRoles?: Role[];
    user?: any;
    method?: string;
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return opts.isPublic ?? false;
      if (key === ROLES_KEY) return opts.requiredRoles ?? undefined;
      return undefined;
    });
    return makeContext({ user: opts.user, method: opts.method ?? 'GET' });
  };

  describe('public routes', () => {
    it('returns true for @Public() endpoints regardless of user', () => {
      const ctx = setup({ isPublic: true });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('unauthenticated requests (no user)', () => {
    it('returns true when user is absent (auth guard handles this)', () => {
      const ctx = setup({ user: undefined });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('admin role', () => {
    it('grants access to admin for any route', () => {
      const ctx = setup({ user: { role: Role.admin }, method: 'DELETE' });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('grants admin access even when specific roles are required', () => {
      const ctx = setup({
        user: { role: Role.admin },
        requiredRoles: [Role.editor],
        method: 'POST',
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('viewer role', () => {
    it('grants viewer access for GET requests', () => {
      const ctx = setup({ user: { role: Role.viewer }, method: 'GET' });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException for viewer on POST', () => {
      const ctx = setup({ user: { role: Role.viewer }, method: 'POST' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for viewer on PUT', () => {
      const ctx = setup({ user: { role: Role.viewer }, method: 'PUT' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for viewer on DELETE', () => {
      const ctx = setup({ user: { role: Role.viewer }, method: 'DELETE' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for viewer on PATCH', () => {
      const ctx = setup({ user: { role: Role.viewer }, method: 'PATCH' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('@Roles() decorator', () => {
    it('grants access when editor has required editor role', () => {
      const ctx = setup({
        user: { role: Role.editor },
        requiredRoles: [Role.editor],
        method: 'POST',
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when editor lacks required admin role', () => {
      const ctx = setup({
        user: { role: Role.editor },
        requiredRoles: [Role.admin],
        method: 'POST',
      });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('returns true when no @Roles() metadata is set and user is editor', () => {
      const ctx = setup({
        user: { role: Role.editor },
        requiredRoles: undefined,
        method: 'POST',
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SignupDto } from '../../auth/dto/signup.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UpdatePasswordDto } from '../../user/dto/update-password.dto';
import { CreateArticleDto } from '../../article/dto/create-article.dto';
import { CreateCategoryDto } from '../../category/dto/create-category.dto';
import { CreateCommentDto } from '../../comment/dto/create-comment.dto';
import { UserRole } from '../../user/user.interface';
import { ArticleStatus } from '../../article/article.interface';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

function errors(cls: any, plain: object) {
  const instance = plainToInstance(cls, plain) as object;
  return validate(instance);
}

async function expectValid(cls: any, plain: object) {
  expect(await errors(cls, plain)).toHaveLength(0);
}

async function expectInvalid(cls: any, plain: object) {
  expect((await errors(cls, plain)).length).toBeGreaterThan(0);
}

describe('SignupDto', () => {
  it('passes with valid login and password', async () => {
    await expectValid(SignupDto, { login: 'alice', password: 'secret123' });
  });

  it('fails when login is missing', async () => {
    await expectInvalid(SignupDto, { password: 'secret123' });
  });

  it('fails when password is missing', async () => {
    await expectInvalid(SignupDto, { login: 'alice' });
  });

  it('fails when login is empty string', async () => {
    await expectInvalid(SignupDto, { login: '', password: 'secret123' });
  });

  it('fails when password is empty string', async () => {
    await expectInvalid(SignupDto, { login: 'alice', password: '' });
  });
});

describe('LoginDto', () => {
  it('passes with valid credentials', async () => {
    await expectValid(LoginDto, { login: 'alice', password: 'pw' });
  });

  it('fails when login is missing', async () => {
    await expectInvalid(LoginDto, { password: 'pw' });
  });

  it('fails when password is missing', async () => {
    await expectInvalid(LoginDto, { login: 'alice' });
  });
});

describe('CreateUserDto', () => {
  it('passes with login and password only', async () => {
    await expectValid(CreateUserDto, { login: 'bob', password: 'pw' });
  });

  it('passes with explicit valid role', async () => {
    await expectValid(CreateUserDto, {
      login: 'bob',
      password: 'pw',
      role: UserRole.EDITOR,
    });
  });

  it('fails when login is missing', async () => {
    await expectInvalid(CreateUserDto, { password: 'pw' });
  });

  it('fails when password is missing', async () => {
    await expectInvalid(CreateUserDto, { login: 'bob' });
  });

  it('fails with invalid role enum value', async () => {
    await expectInvalid(CreateUserDto, {
      login: 'bob',
      password: 'pw',
      role: 'superuser',
    });
  });
});

describe('UpdatePasswordDto', () => {
  it('passes with both passwords provided', async () => {
    await expectValid(UpdatePasswordDto, {
      oldPassword: 'old',
      newPassword: 'new',
    });
  });

  it('fails when oldPassword is missing', async () => {
    await expectInvalid(UpdatePasswordDto, { newPassword: 'new' });
  });

  it('fails when newPassword is missing', async () => {
    await expectInvalid(UpdatePasswordDto, { oldPassword: 'old' });
  });

  it('fails when oldPassword is empty', async () => {
    await expectInvalid(UpdatePasswordDto, {
      oldPassword: '',
      newPassword: 'new',
    });
  });
});

describe('CreateArticleDto', () => {
  it('passes with title and content only', async () => {
    await expectValid(CreateArticleDto, {
      title: 'My Article',
      content: 'Body text',
    });
  });

  it('passes with all optional fields', async () => {
    await expectValid(CreateArticleDto, {
      title: 'My Article',
      content: 'Body text',
      status: ArticleStatus.PUBLISHED,
      authorId: VALID_UUID,
      categoryId: VALID_UUID,
      tags: ['nestjs', 'node'],
    });
  });

  it('fails when title is missing', async () => {
    await expectInvalid(CreateArticleDto, { content: 'Body' });
  });

  it('fails when content is missing', async () => {
    await expectInvalid(CreateArticleDto, { title: 'Title' });
  });

  it('fails with invalid status enum value', async () => {
    await expectInvalid(CreateArticleDto, {
      title: 'T',
      content: 'C',
      status: 'invalid-status',
    });
  });

  it('fails when authorId is not a valid UUID', async () => {
    await expectInvalid(CreateArticleDto, {
      title: 'T',
      content: 'C',
      authorId: 'not-a-uuid',
    });
  });

  it('fails when categoryId is not a valid UUID', async () => {
    await expectInvalid(CreateArticleDto, {
      title: 'T',
      content: 'C',
      categoryId: 'not-a-uuid',
    });
  });
});

describe('CreateCategoryDto', () => {
  it('passes with name and description', async () => {
    await expectValid(CreateCategoryDto, {
      name: 'Tech',
      description: 'Technology articles',
    });
  });

  it('fails when name is missing', async () => {
    await expectInvalid(CreateCategoryDto, { description: 'Tech articles' });
  });

  it('fails when description is missing', async () => {
    await expectInvalid(CreateCategoryDto, { name: 'Tech' });
  });

  it('fails when name is empty string', async () => {
    await expectInvalid(CreateCategoryDto, { name: '', description: 'desc' });
  });
});

describe('CreateCommentDto', () => {
  it('passes with content and valid articleId', async () => {
    await expectValid(CreateCommentDto, {
      content: 'Great!',
      articleId: VALID_UUID,
    });
  });

  it('passes with optional authorId as valid UUID', async () => {
    await expectValid(CreateCommentDto, {
      content: 'Nice',
      articleId: VALID_UUID,
      authorId: VALID_UUID,
    });
  });

  it('fails when content is missing', async () => {
    await expectInvalid(CreateCommentDto, { articleId: VALID_UUID });
  });

  it('fails when articleId is missing', async () => {
    await expectInvalid(CreateCommentDto, { content: 'Hi' });
  });

  it('fails when articleId is not a valid UUID', async () => {
    await expectInvalid(CreateCommentDto, {
      content: 'Hi',
      articleId: 'not-a-uuid',
    });
  });

  it('fails when authorId is not a valid UUID', async () => {
    await expectInvalid(CreateCommentDto, {
      content: 'Hi',
      articleId: VALID_UUID,
      authorId: 'bad-uuid',
    });
  });
});

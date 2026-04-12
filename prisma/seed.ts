import 'dotenv/config';
import { PrismaClient, Role, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = parseInt(process.env.CRYPT_SALT || '10', 10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const editorPassword = await bcrypt.hash('editor123', salt);

  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { login: 'editor' },
    update: {},
    create: {
      login: 'editor',
      password: editorPassword,
      role: Role.EDITOR,
    },
  });

  const category1 = await prisma.category.upsert({
    where: { id: 'tech-category-id' },
    update: {},
    create: {
      id: 'tech-category-id',
      name: 'Technology',
      description: 'Tech related articles',
    },
  });

  const category2 = await prisma.category.upsert({
    where: { id: 'lifestyle-category-id' },
    update: {},
    create: {
      id: 'lifestyle-category-id',
      name: 'Lifestyle',
      description: 'Lifestyle articles',
    },
  });

  const category3 = await prisma.category.upsert({
    where: { id: 'news-category-id' },
    update: {},
    create: {
      id: 'news-category-id',
      name: 'News',
      description: 'Daily news',
    },
  });

  const tagsData = ['NodeJS', 'Prisma', 'Docker', 'NestJS', 'TypeScript'];
  await Promise.all(
    tagsData.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const article1 = await prisma.article.upsert({
    where: { id: 'article-1-id' },
    update: {},
    create: {
      id: 'article-1-id',
      title: 'Getting Started with Prisma',
      content: 'Prisma is a great ORM...',
      status: Status.PUBLISHED,
      authorId: admin.id,
      categoryId: category1.id,
      tags: { connect: [{ name: 'NodeJS' }, { name: 'Prisma' }] },
    },
  });

  const article2 = await prisma.article.upsert({
    where: { id: 'article-2-id' },
    update: {},
    create: {
      id: 'article-2-id',
      title: 'Dockerizing NestJS',
      content: 'Docker makes deployment easy...',
      status: Status.PUBLISHED,
      authorId: editor.id,
      categoryId: category1.id,
      tags: { connect: [{ name: 'Docker' }, { name: 'NestJS' }] },
    },
  });

  await prisma.article.upsert({
    where: { id: 'article-3-id' },
    update: {},
    create: {
      id: 'article-3-id',
      title: 'TypeScript Best Practices',
      content: 'Learn how to use TypeScript...',
      status: Status.DRAFT,
      authorId: admin.id,
      categoryId: category1.id,
      tags: { connect: [{ name: 'TypeScript' }] },
    },
  });

  await prisma.article.upsert({
    where: { id: 'article-4-id' },
    update: {},
    create: {
      id: 'article-4-id',
      title: 'Daily News 2026',
      content: 'What is happening today...',
      status: Status.PUBLISHED,
      authorId: admin.id,
      categoryId: category3.id,
    },
  });

  await prisma.article.upsert({
    where: { id: 'article-5-id' },
    update: {},
    create: {
      id: 'article-5-id',
      title: 'Lifestyle in 2026',
      content: 'Healthy habits...',
      status: Status.ARCHIVED,
      authorId: editor.id,
      categoryId: category2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Great article!',
      authorId: editor.id,
      articleId: article1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Very helpful, thanks!',
      authorId: admin.id,
      articleId: article2.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'I have a question about this...',
      authorId: editor.id,
      articleId: article2.id,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

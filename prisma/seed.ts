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

  const category1 = await prisma.category.create({
    data: { name: 'Technology', description: 'Tech related articles' },
  });

  const tag1 = await prisma.tag.create({ data: { name: 'NodeJS' } });
  const tag2 = await prisma.tag.create({ data: { name: 'Prisma' } });
  const tag3 = await prisma.tag.create({ data: { name: 'Docker' } });
  const tag4 = await prisma.tag.create({ data: { name: 'NestJS' } });

  const article1 = await prisma.article.create({
    data: {
      title: 'Getting Started with Prisma',
      content: 'Prisma is a great ORM...',
      status: Status.PUBLISHED,
      authorId: admin.id,
      categoryId: category1.id,
      tags: { connect: [{ id: tag1.id }, { id: tag2.id }] },
    },
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'Dockerizing NestJS',
      content: 'Docker makes deployment easy...',
      status: Status.PUBLISHED,
      authorId: editor.id,
      categoryId: category1.id,
      tags: { connect: [{ id: tag3.id }, { id: tag4.id }] },
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

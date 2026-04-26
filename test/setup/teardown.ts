import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export default async function globalTeardown(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await prisma.user.deleteMany({
      where: {
        login: {
          startsWith: 'TEST_',
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

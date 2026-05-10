import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppLoggerService } from './common/logger/app-logger.service';

let app: INestApplication | undefined;
const logger = new AppLoggerService();

process.on('uncaughtException', async (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, err.stack, 'Process');
  if (app) await app.close();
  process.exit(1);
});

process.on('unhandledRejection', async (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error(`Unhandled Rejection: ${message}`, stack, 'Process');
  if (app) await app.close();
  process.exit(1);
});

async function bootstrap() {
  app = await NestFactory.create(AppModule, { logger });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('API for Knowledge Hub platform')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`, 'Bootstrap');
}
bootstrap();

import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Increase payload limit for base64 images
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  app.enableShutdownHooks();

  const port = Number(process.env.SERVER_PORT) || 4000;
  await app.listen(port);
  new Logger('SyncDocs').log(`API ready on http://localhost:${port}/api`);
}

void bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './exception/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('backend');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
    allowedHeaders: ['Login-Credentials', 'Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 8080);
}

bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthenticatedExceptionFilter } from './security/filters/authenticated-exception.filter';
import { ForbiddenExceptionFilter } from './security/filters/forbidden-exception.filter';
import { JwtAuthGuard } from './security/guards/jwt-auth.guard';
import { RolesGuard } from './security/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
  app.useGlobalFilters(new AuthenticatedExceptionFilter(), new ForbiddenExceptionFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Disposition',
      'Accept',
      'Content-Type',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Access-Control-Allow-Headers',
      'user-password',
      'user-name',
      'Login-Credentials',
    ],
    methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'HEAD', 'DELETE'],
    maxAge: 3600,
  });

  await app.listen(parseInt(process.env.PORT ?? '8080', 10));
}

bootstrap();

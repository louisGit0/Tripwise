import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const port = process.env.PORT ?? 3000;
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());

  // ── Trust proxy ────────────────────────────────────────────────────────────
  // Render (et Railway, Fly.io…) font passer les requêtes par un reverse-proxy
  // NGINX. Sans cette option, Express voit les requêtes en HTTP et refuse de
  // poser/lire les cookies secure:true. La valeur 1 signifie "faire confiance
  // au premier proxy dans la chaîne x-forwarded-*".
  app.set('trust proxy', 1);

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
}

bootstrap();

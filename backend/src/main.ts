import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const port = process.env.PORT ?? 3000;
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(',');

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  // ── CORS ───────────────────────────────────────────────────────────────────
  // TODO (déploiement Vercel) :
  //   • Mettre CORS_ORIGINS = "https://tripwise.vercel.app" (ou le vrai domaine)
  //   • Activer les cookies cross-domain dans le BFF Next.js :
  //       secure: true, sameSite: 'none'  (nécessite HTTPS des deux côtés)
  //   • Désactiver synchronize: true dans la config TypeORM en production
  //       (utiliser les migrations à la place)
  //   • Générer un JWT_SECRET fort (≥64 chars) et le stocker dans les variables
  //       d'environnement Vercel / Railway / Render
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

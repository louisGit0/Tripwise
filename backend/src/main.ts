import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import session from 'express-session';
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
    .map((o) => o.trim())
    .filter(Boolean);

  // Vercel deployments of THIS project: production alias + every preview/branch
  // build (verygoodtrip-black, verygoodtrip-git-…, verygoodtrip-<hash>). Scoped
  // to the project prefix so an arbitrary attacker.vercel.app is NOT allowed.
  const VERCEL_PREVIEW = /^verygoodtrip[a-z0-9-]*\.vercel\.app$/i;

  const isAllowedOrigin = (origin: string): boolean => {
    if (corsOrigins.includes(origin)) return true;
    let host: string;
    try {
      host = new URL(origin).hostname;
    } catch {
      return false;
    }
    if (host === 'localhost' || host === '127.0.0.1') return true;
    return VERCEL_PREVIEW.test(host);
  };

  // ── Trust proxy ────────────────────────────────────────────────────────────
  // Render (et Railway, Fly.io…) font passer les requêtes par un reverse-proxy
  // NGINX. Sans cette option, Express voit les requêtes en HTTP et refuse de
  // poser/lire les cookies secure:true. La valeur 1 signifie "faire confiance
  // au premier proxy dans la chaîne x-forwarded-*".
  app.set('trust proxy', 1);

  // ── Session (OAuth state store) ────────────────────────────────────────────
  // Requis uniquement pour le state CSRF des flows Google / Apple OAuth.
  // La session expire après 5 min — juste le temps du handshake OAuth.
  // L'authentification REST reste 100% JWT (stateless).
  app.use(
    session({
      secret: process.env.JWT_SECRET ?? 'tw-oauth-state-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      },
    }),
  );

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());

  app.enableCors({
    // Requests without an Origin header (curl, server-to-server, same-origin)
    // are allowed; browser cross-origin requests are checked against the allow-list.
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      }
    },
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

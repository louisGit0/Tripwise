import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  const url = process.env.DATABASE_URL;

  const shared = {
    type: 'postgres' as const,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    // true en dev (confort), false en prod (utiliser les migrations)
    synchronize: !isProd,
    logging: !isProd,
  };

  // DATABASE_URL prend la priorité (Supabase, Neon, Render Postgres…)
  if (url) {
    return {
      ...shared,
      url,
      // Requis pour les connexions externes Supabase / Neon
      ssl: { rejectUnauthorized: false },
    };
  }

  // Connexion par variables individuelles (Docker Compose local)
  return {
    ...shared,
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'tripwise',
    password: process.env.DB_PASSWORD ?? 'tripwise',
    database: process.env.DB_NAME ?? 'tripwise',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
});

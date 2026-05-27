import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

const databaseUrl = process.env.DATABASE_URL;

// La CLI TypeORM (migration:run, migration:generate…) utilise ce DataSource.
// synchronize reste toujours à false ici — la CLI gère les migrations manuellement.
export const AppDataSource = databaseUrl
  ? new DataSource({
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
      synchronize: false,
      logging: true,
    })
  : new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'tripwise',
      password: process.env.DB_PASSWORD ?? 'tripwise',
      database: process.env.DB_NAME ?? 'tripwise',
      entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
      synchronize: false,
      logging: true,
    });

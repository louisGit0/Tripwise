import path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  I18nJsonLoader,
} from 'nestjs-i18n';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { TripsModule } from './trips/trips.module';
import { FavoritesModule } from './favorites/favorites.module';
import { FuelPricesModule } from './fuel-prices/fuel-prices.module';
import { ChargingStationsModule } from './charging-stations/charging-stations.module';
import { MapboxModule } from './mapbox/mapbox.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig],
    }),
    // 100 req/min par IP par défaut ; les routes sensibles surchargent via @Throttle()
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'fr',
      loaders: [
        new I18nJsonLoader({
          // En production : dist/i18n/ (copié par nest-cli assets)
          // En développement (ts-node) : src/i18n/
          path: path.join(__dirname, 'i18n'),
        }),
      ],
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
    MapboxModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    TripsModule,
    FavoritesModule,
    FuelPricesModule,
    ChargingStationsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

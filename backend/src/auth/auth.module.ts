import { Logger, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // Guards déclarés ici pour que la DI puisse résoudre ConfigService
    GoogleAuthGuard,
    AppleAuthGuard,
    {
      provide: GoogleStrategy,
      useFactory: (config: ConfigService, authService: AuthService) => {
        const clientID = config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
        if (!clientID) {
          new Logger('AuthModule').warn(
            'GOOGLE_OAUTH_CLIENT_ID non défini — authentification Google désactivée',
          );
          return null;
        }
        return new GoogleStrategy(config, authService);
      },
      inject: [ConfigService, AuthService],
    },
    {
      provide: AppleStrategy,
      useFactory: (config: ConfigService, authService: AuthService) => {
        const clientID = config.get<string>('APPLE_OAUTH_CLIENT_ID');
        const teamID = config.get<string>('APPLE_OAUTH_TEAM_ID');
        const keyID = config.get<string>('APPLE_OAUTH_KEY_ID');
        const privateKey = config.get<string>('APPLE_OAUTH_PRIVATE_KEY');
        if (!clientID || !teamID || !keyID || !privateKey) {
          new Logger('AuthModule').warn(
            'APPLE_OAUTH_* variables manquantes — authentification Apple désactivée',
          );
          return null;
        }
        return new AppleStrategy(config, authService);
      },
      inject: [ConfigService, AuthService],
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

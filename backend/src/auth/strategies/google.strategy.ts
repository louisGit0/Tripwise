import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_OAUTH_CLIENT_ID')!,
      clientSecret: config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET')!,
      callbackURL: config.get<string>('GOOGLE_OAUTH_CALLBACK_URL')!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName?: string;
    },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Email manquant dans le profil Google'), false);

    const user = await this.authService.findOrCreateOAuthUser({
      email,
      provider: 'google',
      providerId: profile.id,
      displayName: profile.displayName ?? null,
    });

    done(null, user);
  }
}

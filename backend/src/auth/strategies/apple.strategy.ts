import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface AppleProfile {
  id?: string;
  email?: string;
  name?: { firstName?: string; lastName?: string };
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('APPLE_OAUTH_CLIENT_ID')!,
      teamID: config.get<string>('APPLE_OAUTH_TEAM_ID')!,
      keyID: config.get<string>('APPLE_OAUTH_KEY_ID')!,
      privateKeyString: config.get<string>('APPLE_OAUTH_PRIVATE_KEY')!,
      callbackURL: config.get<string>('APPLE_OAUTH_CALLBACK_URL')!,
      passReqToCallback: false,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    idToken: { sub?: string; email?: string },
    profile: AppleProfile,
    done: (err: Error | null, user?: unknown) => void,
  ) {
    // Apple envoie l'email uniquement au premier login ; ensuite on reçoit juste sub.
    const email = idToken.email ?? profile.email;
    const providerId = idToken.sub ?? profile.id;

    if (!email || !providerId) {
      return done(new Error('Données insuffisantes dans le token Apple'));
    }

    const displayName = profile.name
      ? [profile.name.firstName, profile.name.lastName].filter(Boolean).join(' ') || null
      : null;

    const user = await this.authService.findOrCreateOAuthUser({
      email,
      provider: 'apple',
      providerId,
      displayName,
    });

    done(null, user);
  }
}

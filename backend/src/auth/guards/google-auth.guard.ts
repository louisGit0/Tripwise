import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID')) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured on this server',
      );
    }
    return super.canActivate(context);
  }
}

import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AppleAuthGuard extends AuthGuard('apple') implements CanActivate {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      !this.configService.get<string>('APPLE_OAUTH_CLIENT_ID') ||
      !this.configService.get<string>('APPLE_OAUTH_TEAM_ID') ||
      !this.configService.get<string>('APPLE_OAUTH_KEY_ID') ||
      !this.configService.get<string>('APPLE_OAUTH_PRIVATE_KEY')
    ) {
      throw new ServiceUnavailableException(
        'Apple Sign In is not configured on this server',
      );
    }
    return super.canActivate(context);
  }
}

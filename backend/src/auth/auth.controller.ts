import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AppleAuthGuard } from './guards/apple-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }

  // ── Local ──────────────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  login(
    @CurrentUser() user: User,
    @Body() _dto: LoginDto, // validé par le guard ; déclaré pour la doc uniquement
  ): AuthResponseDto {
    return this.authService.login(user);
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Redirection gérée par Passport
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Redirect('', 302)
  googleCallback(@Req() req: { user: User }): { url: string } {
    const { accessToken } = this.authService.buildAuthResponseForOAuth(req.user);
    return { url: `${this.frontendUrl}/auth/callback/google?token=${accessToken}` };
  }

  // ── Apple Sign In ──────────────────────────────────────────────────────────

  @Get('apple')
  @UseGuards(AppleAuthGuard)
  appleAuth() {
    // Redirection gérée par Passport
  }

  @Post('apple/callback')
  @UseGuards(AppleAuthGuard)
  @Redirect('', 302)
  appleCallback(@Req() req: { user: User }): { url: string } {
    const { accessToken } = this.authService.buildAuthResponseForOAuth(req.user);
    return { url: `${this.frontendUrl}/auth/callback/apple?token=${accessToken}` };
  }

  // ── Profil ─────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      locale: user.locale,
      provider: user.provider,
      createdAt: user.createdAt,
    };
  }
}

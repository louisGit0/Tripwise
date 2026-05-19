import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
  constructor(private readonly authService: AuthService) {}

  // ── Local ──────────────────────────────────────────────────────────────────

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  googleCallback(@Req() req: { user: User }): AuthResponseDto {
    return this.authService.buildAuthResponseForOAuth(req.user);
  }

  // ── Apple Sign In ──────────────────────────────────────────────────────────

  @Get('apple')
  @UseGuards(AppleAuthGuard)
  appleAuth() {
    // Redirection gérée par Passport
  }

  @Get('apple/callback')
  @UseGuards(AppleAuthGuard)
  appleCallback(@Req() req: { user: User }): AuthResponseDto {
    return this.authService.buildAuthResponseForOAuth(req.user);
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

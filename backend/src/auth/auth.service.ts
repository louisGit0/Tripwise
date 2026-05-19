import {
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

const BCRYPT_SALT_ROUNDS = 12;

interface OAuthUserData {
  email: string;
  provider: 'google' | 'apple';
  providerId: string;
  displayName: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Local ──────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName ?? null,
      provider: AuthProvider.LOCAL,
    });

    return this.buildAuthResponse(user);
  }

  async validateLocalUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  login(user: User): AuthResponseDto {
    return this.buildAuthResponse(user);
  }

  // ── OAuth ──────────────────────────────────────────────────────────────────

  async findOrCreateOAuthUser(data: OAuthUserData): Promise<User> {
    const existing = await this.usersService.findByEmail(data.email);

    if (existing) {
      // Lier le compte OAuth si l'utilisateur existait en local
      if (existing.provider === AuthProvider.LOCAL) {
        return this.usersService.linkOAuthProvider(existing.id, {
          provider: data.provider as AuthProvider,
          providerId: data.providerId,
        });
      }
      return existing;
    }

    return this.usersService.create({
      email: data.email,
      passwordHash: null,
      displayName: data.displayName,
      provider: data.provider as AuthProvider,
      providerId: data.providerId,
    });
  }

  buildAuthResponseForOAuth(user: User): AuthResponseDto {
    return this.buildAuthResponse(user);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildAuthResponse(user: User): AuthResponseDto {
    const payload = { sub: user.id, email: user.email, provider: user.provider };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        locale: user.locale,
        provider: user.provider,
      },
    };
  }
}

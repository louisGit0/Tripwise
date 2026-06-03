import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PATCH /api/v1/users/me — édite le pseudo de l'utilisateur authentifié.
   * IDOR-safe : l'id cible vient de @CurrentUser(), aucun paramètre d'id accepté.
   * Retourne le profil mis à jour (même projection que GET /auth/me, sans passwordHash).
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.id, dto.displayName);
    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      locale: updated.locale,
      provider: updated.provider,
      createdAt: updated.createdAt,
    };
  }

  /**
   * DELETE /api/v1/users/me — supprime définitivement le compte de l'utilisateur
   * authentifié et toutes ses données (véhicules, favoris, trajets) via cascade FK.
   * IDOR-safe : la cible vient de @CurrentUser(), aucun id n'est accepté en paramètre.
   * Requis par Apple (Guideline 5.1.1 (v) — suppression de compte in-app). Retourne 204.
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: User): Promise<void> {
    await this.usersService.deleteAccount(user.id);
  }
}

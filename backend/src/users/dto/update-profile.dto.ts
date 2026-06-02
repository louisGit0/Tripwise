import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Corps de PATCH /users/me — édition du pseudo (display_name).
 * Seul `displayName` est modifiable : le ValidationPipe global (whitelist +
 * forbidNonWhitelisted) rejette tout autre champ. La valeur est trimée avant
 * validation, donc une chaîne vide ou composée uniquement d'espaces est rejetée.
 */
export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  displayName!: string;
}

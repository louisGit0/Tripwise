import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Query de résolution photo : `GET /vehicles/catalog/image?make=&model=`.
 *
 * Borne d'entrée (anti-DoS/SSRF) : seuls `make` et `model` franchissent la
 * frontière, tous deux non-vides et plafonnés à 80 caractères. Le global
 * ValidationPipe (`whitelist` + `forbidNonWhitelisted`) rejette toute autre clé,
 * et le service URL-encode make/model avant l'appel sortant.
 */
export class CatalogImageQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  make!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model!: string;
}

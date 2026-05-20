import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Favorite } from './entities/favorite.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly repo: Repository<Favorite>,
    @Optional() private readonly i18n: I18nService | null,
  ) {}

  private async t(key: string, lang: string): Promise<string> {
    if (this.i18n) return this.i18n.translate<string>(key, { lang });
    return key;
  }

  findAll(userId: string): Promise<Favorite[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string, lang = 'fr'): Promise<Favorite> {
    const fav = await this.repo.findOneBy({ id });
    if (!fav) {
      throw new NotFoundException(await this.t('messages.favorites.not_found', lang));
    }
    if (fav.userId !== userId) {
      throw new ForbiddenException(await this.t('messages.favorites.forbidden', lang));
    }
    return fav;
  }

  async create(userId: string, dto: CreateFavoriteDto): Promise<Favorite> {
    const fav = this.repo.create({ ...dto, userId });
    return this.repo.save(fav);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFavoriteDto,
    lang = 'fr',
  ): Promise<Favorite> {
    const fav = await this.findOne(userId, id, lang);
    fav.name = dto.name;
    return this.repo.save(fav);
  }

  async remove(userId: string, id: string, lang = 'fr'): Promise<void> {
    const fav = await this.findOne(userId, id, lang);
    await this.repo.remove(fav);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { UpdateFavoriteDto } from './dto/update-favorite.dto';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.favoritesService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.favoritesService.findOne(user.id, id, this.detectLang(req));
  }

  @Post()
  create(@Body() dto: CreateFavoriteDto, @CurrentUser() user: User) {
    return this.favoritesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFavoriteDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.favoritesService.update(user.id, id, dto, this.detectLang(req));
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    return this.favoritesService.remove(user.id, id, this.detectLang(req));
  }

  private detectLang(req: Request): string {
    const query = req.query['lang'];
    if (typeof query === 'string' && ['fr', 'en'].includes(query)) return query;
    const accept = req.headers['accept-language'];
    if (accept) {
      const lang = accept.split(',')[0].split('-')[0].toLowerCase();
      if (['fr', 'en'].includes(lang)) return lang;
    }
    return 'fr';
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { AddUserVehicleDto } from './dto/add-user-vehicle.dto';
import { UpdateUserVehicleDto } from './dto/update-user-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ── Catalogue public ───────────────────────────────────────────────────────

  @Get('catalog')
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.vehiclesService.findCatalog(query);
  }

  @Get('catalog/:id')
  getCatalogItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOneModel(id);
  }

  // ── Véhicules utilisateur (auth requise) ───────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyVehicles(@CurrentUser() user: User) {
    return this.vehiclesService.findUserVehicles(user.id);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addVehicle(@CurrentUser() user: User, @Body() dto: AddUserVehicleDto) {
    return this.vehiclesService.addUserVehicle(user.id, dto);
  }

  @Patch('me/:id')
  @UseGuards(JwtAuthGuard)
  updateVehicle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserVehicleDto,
  ) {
    return this.vehiclesService.updateUserVehicle(user.id, id, dto);
  }

  @Delete('me/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVehicle(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.removeUserVehicle(user.id, id);
  }
}

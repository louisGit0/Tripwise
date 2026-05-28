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
import { VehicleSyncService } from './vehicle-sync.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { AddUserVehicleDto } from './dto/add-user-vehicle.dto';
import { UpdateUserVehicleDto } from './dto/update-user-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleSyncService: VehicleSyncService,
  ) {}

  // ── Catalogue public ───────────────────────────────────────────────────────

  @Get('catalog')
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.vehiclesService.findCatalog(query);
  }

  @Get('catalog/:id')
  getCatalogItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOneModel(id);
  }

  /**
   * Manually triggers an ADEME catalog sync.
   * Idempotent — only inserts models not already in the DB.
   * Requires authentication (any valid JWT).
   */
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  syncCatalog() {
    return this.vehicleSyncService.syncFromAdeme();
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

  @Patch('me/:id/set-default')
  @UseGuards(JwtAuthGuard)
  setDefault(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.setDefaultVehicle(user.id, id);
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

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { VehiclesService } from './vehicles.service';
import { VehicleSyncService } from './vehicle-sync.service';
import { VehicleImageService } from './vehicle-image.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CatalogImageQueryDto } from './dto/catalog-image-query.dto';
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
    private readonly vehicleImageService: VehicleImageService,
  ) {}

  // ── Catalogue public ───────────────────────────────────────────────────────

  @Get('catalog')
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.vehiclesService.findCatalog(query);
  }

  // NOTE: declared BEFORE `catalog/:id` so Nest does not match 'brands' as an id.
  @Get('catalog/brands')
  getCatalogBrands(@Query() query: CatalogQueryDto) {
    return this.vehiclesService.findCatalogBrands(query);
  }

  // NOTE: declared BEFORE `catalog/:id` so Nest does not match 'image' as an id.
  //
  // BYTE PROXY (D-35): the CarImages signed URL EMBEDS the api_key and the image
  // 401s without it — so we can NEVER hand the URL to the client. The service
  // resolves the signed URL AND fetches the bytes server-side; we stream only the
  // raw bytes back. The api_key never appears in any response header or body.
  //   - 200 image/webp + long-lived Cache-Control on a hit (clients cache, so they
  //     do not re-hit us — keeps the showroom fan-out off our quota);
  //   - 204 No Content on a miss / no-key / any failure (client shows the brand
  //     placeholder). Never throws (catch → 204).
  //
  // The showroom renders ~60 image cards per page, each hitting this endpoint — a
  // fan-out that would blow past the global 100 req/min ThrottlerGuard → 429 →
  // random placeholders. Exempt THIS route only: it is GET-only, key-safe, and
  // cached server-side + client-side, so skipping rate-limiting here is safe. (WR-03)
  @Get('catalog/image')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async getCatalogImage(
    @Query() query: CatalogImageQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const image = await this.vehicleImageService.fetchImageBytes(
        query.make,
        query.model,
      );

      if (!image) {
        res.status(HttpStatus.NO_CONTENT).end();
        return;
      }

      res.status(HttpStatus.OK);
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.end(image.body);
    } catch {
      // fetchImageBytes is never-throw by design; this is a defensive backstop so
      // the endpoint cannot 500 (which would leak nothing but break the grid). 204
      // → client placeholder.
      res.status(HttpStatus.NO_CONTENT).end();
    }
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

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { GeocodeQueryDto } from './dto/geocode-query.dto';
import { CalculateTripDto } from './dto/calculate-trip.dto';
import { SaveTripDto } from './dto/save-trip.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { CalculateMultiDto } from './dto/calculate-multi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ── Geocode (GET /trips/geocode) ────────────────────────────────────────────

  @Get('geocode')
  geocode(@Query() query: GeocodeQueryDto) {
    return this.tripsService.geocode(query.q, {
      country: query.country,
      limit: query.limit,
    });
  }

  // ── History (GET /trips/history) — before :id ───────────────────────────────

  @Get('history')
  getHistory(@CurrentUser() user: User, @Query() query: HistoryQueryDto) {
    return this.tripsService.getHistory(user.id, query);
  }

  // ── Stats (GET /trips/stats) — before :id ──────────────────────────────────

  @Get('stats')
  getStats(@CurrentUser() user: User, @Query() query: StatsQueryDto) {
    return this.tripsService.getStats(user.id, query);
  }

  // ── Calculate (POST /trips/calculate) ──────────────────────────────────────

  @Post('calculate')
  calculate(@CurrentUser() user: User, @Body() dto: CalculateTripDto) {
    return this.tripsService.calculate(user.id, dto);
  }

  // ── Calculate multi (POST /trips/calculate-multi) ──────────────────────────

  @Post('calculate-multi')
  calculateMulti(@CurrentUser() user: User, @Body() dto: CalculateMultiDto) {
    return this.tripsService.calculateMulti(user.id, dto);
  }

  // ── Save (POST /trips/save) ────────────────────────────────────────────────

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  saveTrip(@CurrentUser() user: User, @Body() dto: SaveTripDto) {
    return this.tripsService.saveTrip(user.id, dto);
  }

  // ── Detail (GET /trips/:id) ────────────────────────────────────────────────

  @Get(':id')
  getTripById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.getTripById(user.id, id);
  }

  // ── Update (PATCH /trips/:id) ──────────────────────────────────────────────

  @Patch(':id')
  updateTrip(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(user.id, id, dto);
  }

  // ── Delete (DELETE /trips/:id) ─────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTrip(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.deleteTrip(user.id, id);
  }
}

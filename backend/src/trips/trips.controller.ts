import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { GeocodeQueryDto } from './dto/geocode-query.dto';
import { CalculateTripDto } from './dto/calculate-trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * Proxie l'autocomplétion Mapbox pour éviter d'exposer le token au frontend.
   * GET /trips/geocode?q=Paris&country=fr&limit=5
   */
  @Get('geocode')
  geocode(@Query() query: GeocodeQueryDto) {
    return this.tripsService.geocode(query.q, {
      country: query.country,
      limit: query.limit,
    });
  }

  /**
   * Calcule distance, durée et géométrie d'un trajet.
   * Le calcul de coût sera ajouté dans un prochain module.
   */
  @Post('calculate')
  calculate(@CurrentUser() user: User, @Body() dto: CalculateTripDto) {
    return this.tripsService.calculate(user.id, dto);
  }
}

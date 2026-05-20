import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChargingStationsService } from './charging-stations.service';
import { NearbyStationsQueryDto } from './dto/nearby-stations-query.dto';
import { AlongRouteBodyDto } from './dto/along-route-body.dto';

@UseGuards(JwtAuthGuard)
@Controller('charging-stations')
export class ChargingStationsController {
  constructor(private readonly stations: ChargingStationsService) {}

  @Get('nearby')
  findNearby(@Query() query: NearbyStationsQueryDto) {
    return this.stations.findStationsNearPoint(query.lat, query.lng, query.radius);
  }

  // POST plutôt que GET car la géométrie de l'itinéraire est transmise dans le body
  @Post('along-route')
  findAlongRoute(@Body() body: AlongRouteBodyDto) {
    return this.stations.findStationsAlongRoute(body.geometry, body.maxDistanceMeters);
  }
}

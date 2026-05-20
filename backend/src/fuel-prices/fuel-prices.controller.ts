import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FuelPricesService } from './fuel-prices.service';
import { FuelPriceQueryDto } from './dto/fuel-price-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('fuel-prices')
export class FuelPricesController {
  constructor(private readonly fuelPrices: FuelPricesService) {}

  @Get('nearest')
  findNearest(@Query() query: FuelPriceQueryDto) {
    return this.fuelPrices.findNearestStationPrice(query.lat, query.lng, query.fuelType);
  }
}

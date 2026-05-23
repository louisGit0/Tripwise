import { Controller, Get, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  /** GET /api/v1/prices/defaults — Prix de référence backend (constantes statiques) */
  @Get('defaults')
  @UseGuards(JwtAuthGuard)
  getDefaults() {
    return this.pricesService.getDefaults();
  }
}

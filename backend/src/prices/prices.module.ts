import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';
import { FuelPricesModule } from '../fuel-prices/fuel-prices.module';

@Module({
  imports: [FuelPricesModule],
  controllers: [PricesController],
  providers: [PricesService],
})
export class PricesModule {}

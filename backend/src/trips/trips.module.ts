import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { FuelPricesModule } from '../fuel-prices/fuel-prices.module';
import { ChargingStationsModule } from '../charging-stations/charging-stations.module';

@Module({
  imports: [VehiclesModule, FuelPricesModule, ChargingStationsModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}

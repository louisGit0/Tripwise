import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip } from './entities/trip.entity';
import { UserVehicle } from '../vehicles/entities/user-vehicle.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { FuelPricesModule } from '../fuel-prices/fuel-prices.module';
import { ChargingStationsModule } from '../charging-stations/charging-stations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, UserVehicle]),
    VehiclesModule,
    FuelPricesModule,
    ChargingStationsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}

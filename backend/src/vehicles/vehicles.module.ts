import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleSyncService } from './vehicle-sync.service';
import { VehicleImageService } from './vehicle-image.service';
import { VehicleModel } from './entities/vehicle-model.entity';
import { UserVehicle } from './entities/user-vehicle.entity';
import { Trip } from '../trips/entities/trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleModel, UserVehicle, Trip])],
  controllers: [VehiclesController],
  // ConfigModule is @Global (AppModule) — VehicleImageService needs no extra import.
  providers: [VehiclesService, VehicleSyncService, VehicleImageService],
  exports: [VehiclesService],
})
export class VehiclesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleSyncService } from './vehicle-sync.service';
import { VehicleModel } from './entities/vehicle-model.entity';
import { UserVehicle } from './entities/user-vehicle.entity';
import { Trip } from '../trips/entities/trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleModel, UserVehicle, Trip])],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleSyncService],
  exports: [VehiclesService],
})
export class VehiclesModule {}

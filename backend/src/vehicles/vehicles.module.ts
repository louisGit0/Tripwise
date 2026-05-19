import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleModel } from './entities/vehicle-model.entity';
import { UserVehicle } from './entities/user-vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleModel, UserVehicle])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}

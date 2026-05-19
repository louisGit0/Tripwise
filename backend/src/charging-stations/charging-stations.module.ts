import { Module } from '@nestjs/common';
import { ChargingStationsController } from './charging-stations.controller';
import { ChargingStationsService } from './charging-stations.service';

@Module({
  controllers: [ChargingStationsController],
  providers: [ChargingStationsService]
})
export class ChargingStationsModule {}

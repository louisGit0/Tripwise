import { Module } from '@nestjs/common';
import { TollService } from './toll.service';

// Pas de controller : le service est uniquement consommé par TripsService.
// ConfigModule est global (AppModule) — aucun import supplémentaire requis.
@Module({
  providers: [TollService],
  exports: [TollService],
})
export class TollModule {}

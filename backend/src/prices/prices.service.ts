import { Injectable, Optional } from '@nestjs/common';
import { DEFAULT_PRICES } from '../common/default-prices';
import { FuelPricesService } from '../fuel-prices/fuel-prices.service';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface PreviousPrices {
  gas: number;
  diesel: number;
  sp95: number;
  sp98: number;
  e10: number;
  e85: number;
  gpl: number;
  evHome: number;
  evFast: number;
}

export interface DefaultPricesResponse {
  gas: number;
  diesel: number;
  evHome: number;
  evFast: number;
  fastShare: number;
  sp95: number;
  sp98: number;
  e10: number;
  e85: number;
  gpl: number;
  gazole: number;
  source: string;
  lastUpdate: string;
  disclaimer: string;
  /** Prix de la snapshot précédente — disponible après 2 rafraîchissements */
  previousPrices?: PreviousPrices;
  /** Horodatage de la snapshot précédente */
  previousFetchedAt?: string;
}

interface Snapshot {
  prices: PreviousPrices;
  fetchedAt: string;
}

@Injectable()
export class PricesService {
  private currentSnapshot: Snapshot | null = null;
  private previousSnapshot: Snapshot | null = null;
  private nextFetchAt = 0;

  constructor(
    @Optional() private readonly fuelPrices: FuelPricesService | null,
  ) {}

  async getDefaults(): Promise<DefaultPricesResponse> {
    await this.maybeRefreshCache();

    const base = { ...DEFAULT_PRICES };

    if (this.currentSnapshot) {
      const p = this.currentSnapshot.prices;
      return {
        gas:       p.gas,
        diesel:    p.diesel,
        evHome:    p.evHome,
        evFast:    p.evFast,
        fastShare: base.fastShare,
        sp95:      p.sp95,
        sp98:      p.sp98,
        e10:       p.e10,
        e85:       p.e85,
        gpl:       p.gpl,
        gazole:    p.diesel,
        source:    'api',
        lastUpdate: this.currentSnapshot.fetchedAt,
        disclaimer: base.disclaimer,
        previousPrices:    this.previousSnapshot?.prices,
        previousFetchedAt: this.previousSnapshot?.fetchedAt,
      };
    }

    return {
      ...base,
      lastUpdate: new Date().toISOString(),
    };
  }

  private async maybeRefreshCache(): Promise<void> {
    if (!this.fuelPrices) return;
    if (Date.now() < this.nextFetchAt) return;

    // Schedule next fetch immediately to avoid concurrent calls
    this.nextFetchAt = Date.now() + CACHE_TTL_MS;

    try {
      const [sp95R, sp98R, e10R, dieselR, e85R, gplR] = await Promise.allSettled([
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.SP95),
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.SP98),
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.SP95_E10),
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.DIESEL),
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.E85),
        this.fuelPrices.findNearestStationPrice(PARIS_LAT, PARIS_LNG, FuelType.GPL),
      ]);

      const pick = (r: PromiseSettledResult<{ price: number } | null>, fallback: number): number => {
        if (r.status === 'fulfilled' && r.value?.price && r.value.price > 0) return r.value.price;
        return fallback;
      };

      const b = DEFAULT_PRICES;
      const newPrices: PreviousPrices = {
        sp95:   pick(sp95R,   b.sp95),
        sp98:   pick(sp98R,   b.sp98),
        e10:    pick(e10R,    b.e10),
        gas:    pick(e10R,    b.gas),     // SP95-E10 = référence "essence" pour les calculs
        diesel: pick(dieselR, b.diesel),
        e85:    pick(e85R,    b.e85),
        gpl:    pick(gplR,    b.gpl),
        evHome: b.evHome,
        evFast: b.evFast,
      };

      if (this.currentSnapshot) {
        this.previousSnapshot = this.currentSnapshot;
      }

      this.currentSnapshot = {
        prices:    newPrices,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // silently fall back to static defaults on next call
    }
  }
}

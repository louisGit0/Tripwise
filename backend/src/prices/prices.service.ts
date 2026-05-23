import { Injectable } from '@nestjs/common';
import { DEFAULT_PRICES } from '../common/default-prices';

export interface DefaultPricesResponse {
  gas: number;
  diesel: number;
  evHome: number;
  evFast: number;
  fastShare: number;
  source: string;
  lastUpdate: string;
  disclaimer: string;
}

@Injectable()
export class PricesService {
  /**
   * Retourne les prix de référence statiques du backend.
   * Ces valeurs sont des constantes mises à jour manuellement — aucun appel API.
   * TODO : envisager un mécanisme de mise à jour périodique (cron + API carburants).
   */
  getDefaults(): DefaultPricesResponse {
    return {
      ...DEFAULT_PRICES,
      lastUpdate: new Date().toISOString(),
    };
  }
}

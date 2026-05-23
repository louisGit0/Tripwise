import { FuelType } from '../enums/index';

/**
 * Catégorie fonctionnelle d'un carburant, utilisée pour l'affichage et le filtrage.
 *
 * - gas    → tous les essences (SP95, SP95_E10, SP98, E85)
 * - diesel → gazole
 * - ev     → électrique
 * - gpl    → GPL
 */
export type FuelCategory = 'gas' | 'diesel' | 'ev' | 'gpl';

/**
 * Mappe un {@link FuelType} vers sa {@link FuelCategory} fonctionnelle.
 *
 * @example
 *   toCategory(FuelType.SP95_E10) // → 'gas'
 *   toCategory(FuelType.ELECTRIC) // → 'ev'
 */
export function toCategory(fuelType: FuelType): FuelCategory {
  switch (fuelType) {
    case FuelType.SP95:
    case FuelType.SP95_E10:
    case FuelType.SP98:
    case FuelType.E85:
      return 'gas';
    case FuelType.DIESEL:
      return 'diesel';
    case FuelType.ELECTRIC:
      return 'ev';
    case FuelType.GPL:
      return 'gpl';
  }
}

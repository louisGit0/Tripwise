import { FuelType } from '../vehicles/entities/vehicle-model.entity';

/**
 * Catégorie fonctionnelle d'un carburant, utilisée pour l'affichage et le filtrage.
 *
 * - gas    → tous les essences (SP95, SP95_E10, SP98, E85)
 * - diesel → gazole
 * - ev     → électrique
 * - gpl    → GPL / GNV
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

/**
 * Reverse of {@link toCategory} — expands a {@link FuelCategory} into the set of
 * {@link FuelType} values it covers. Used to filter the catalog by a functional
 * category in a single query (no per-chip round-trips).
 *
 * @example
 *   categoryToFuelTypes('gas') // → [SP95, SP95_E10, SP98, E85]
 *   categoryToFuelTypes('ev')  // → [ELECTRIC]
 */
export function categoryToFuelTypes(category: FuelCategory): FuelType[] {
  switch (category) {
    case 'gas':
      return [FuelType.SP95, FuelType.SP95_E10, FuelType.SP98, FuelType.E85];
    case 'diesel':
      return [FuelType.DIESEL];
    case 'ev':
      return [FuelType.ELECTRIC];
    case 'gpl':
      return [FuelType.GPL];
  }
}

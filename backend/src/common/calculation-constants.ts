/**
 * Consommations et prix de référence nationaux France 2026.
 * Valeurs indicatives — sources : ADEME, IEA, observatoire prix carburants.
 * À réviser annuellement.
 */
export const DEFAULT_GAS_CONSUMPTION  = 6.5;   // L/100km essence moyenne
export const DEFAULT_DIESEL_CONSUMPTION = 5.5;  // L/100km diesel moyen
export const DEFAULT_EV_CONSUMPTION   = 15.5;  // kWh/100km EV moyen

export const DEFAULT_GAS_PRICE    = 1.85;  // €/L SP95 (fallback)
export const DEFAULT_DIESEL_PRICE = 1.65;  // €/L diesel (fallback)
export const DEFAULT_EV_HOME      = 0.21;  // €/kWh recharge domicile
export const DEFAULT_EV_FAST      = 0.49;  // €/kWh borne rapide publique
export const DEFAULT_FAST_SHARE   = 0.30;  // fraction recharge rapide (défaut mix)

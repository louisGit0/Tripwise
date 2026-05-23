/** Types de carburant supportés par l'application */
export enum FuelType {
  SP95     = 'SP95',
  SP95_E10 = 'SP95_E10',
  SP98     = 'SP98',
  DIESEL   = 'DIESEL',
  E85      = 'E85',
  GPL      = 'GPL',
  ELECTRIC = 'ELECTRIC',
}

/** Fournisseurs d'authentification supportés */
export enum AuthProvider {
  LOCAL  = 'local',
  GOOGLE = 'google',
  APPLE  = 'apple',
}

/** Modes de recharge pour les véhicules électriques */
export enum ChargingMode {
  HOME   = 'home',
  PUBLIC = 'public',
  MIX    = 'mix',
}

/**
 * Unité d'énergie consommée lors d'un trajet.
 * L   → litres (thermiques)
 * KWH → kilowattheures (électriques)
 */
export enum EnergyUnit {
  L   = 'L',
  KWH = 'kWh',
}

export enum FuelType {
  SP95 = 'SP95',
  SP95_E10 = 'SP95_E10',
  SP98 = 'SP98',
  DIESEL = 'DIESEL',
  E85 = 'E85',
  GPL = 'GPL',
  ELECTRIC = 'ELECTRIC',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export type ChargingMode = 'home' | 'public' | 'mix';

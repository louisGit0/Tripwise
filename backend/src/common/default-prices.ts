import {
  DEFAULT_GAS_PRICE,
  DEFAULT_DIESEL_PRICE,
  DEFAULT_EV_HOME,
  DEFAULT_EV_FAST,
  DEFAULT_FAST_SHARE,
} from './calculation-constants';

export const DEFAULT_PRICES = {
  gas:        DEFAULT_GAS_PRICE,
  diesel:     DEFAULT_DIESEL_PRICE,
  evHome:     DEFAULT_EV_HOME,
  evFast:     DEFAULT_EV_FAST,
  fastShare:  DEFAULT_FAST_SHARE,
  source:     'static-fallback' as const,
  disclaimer: "Tarifs indicatifs basés sur des moyennes France 2026. Les prix réels varient selon votre fournisseur et la station.",
};

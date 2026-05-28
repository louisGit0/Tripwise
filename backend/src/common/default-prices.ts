import {
  DEFAULT_GAS_PRICE,
  DEFAULT_DIESEL_PRICE,
  DEFAULT_EV_HOME,
  DEFAULT_EV_FAST,
  DEFAULT_FAST_SHARE,
  DEFAULT_SP95_PRICE,
  DEFAULT_SP98_PRICE,
  DEFAULT_E10_PRICE,
  DEFAULT_E85_PRICE,
  DEFAULT_GPL_PRICE,
  DEFAULT_GAZOLE_PRICE,
} from './calculation-constants';

export const DEFAULT_PRICES = {
  gas:        DEFAULT_GAS_PRICE,
  diesel:     DEFAULT_DIESEL_PRICE,
  evHome:     DEFAULT_EV_HOME,
  evFast:     DEFAULT_EV_FAST,
  fastShare:  DEFAULT_FAST_SHARE,
  sp95:       DEFAULT_SP95_PRICE,
  sp98:       DEFAULT_SP98_PRICE,
  e10:        DEFAULT_E10_PRICE,
  e85:        DEFAULT_E85_PRICE,
  gpl:        DEFAULT_GPL_PRICE,
  gazole:     DEFAULT_GAZOLE_PRICE,
  source:     'static-fallback' as const,
  disclaimer: "Tarifs indicatifs basés sur des moyennes France 2026. Les prix réels varient selon votre fournisseur et la station.",
};

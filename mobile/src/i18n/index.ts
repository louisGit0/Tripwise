import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import fr from './translations/fr';
import en from './translations/en';

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'fr';
const supportedLng = ['fr', 'en'];
const lng = supportedLng.includes(deviceLang) ? deviceLang : 'fr';

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export { i18n };
export default i18n;

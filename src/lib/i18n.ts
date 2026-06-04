import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import trTranslation from '../locales/tr.json';
import enTranslation from '../locales/en.json';

const savedLang = localStorage.getItem('marinmc_setting_language') || 'tr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: trTranslation },
      en: { translation: enTranslation }
    },
    lng: savedLang,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false // React already escapes
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;

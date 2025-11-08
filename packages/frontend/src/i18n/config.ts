import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import zhTranslations from './locales/zh.json';

// RTL languages list
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  // Future languages (when translations are added):
  // { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  // { code: 'ko', name: 'Korean', nativeName: '한국어' },
  // { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      zh: {
        translation: zhTranslations,
      },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.some(lang => lng.startsWith(lang)) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// Set initial direction
const initialDir = RTL_LANGUAGES.some(lang => i18n.language.startsWith(lang)) ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = i18n.language;

export default i18n;

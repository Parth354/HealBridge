import i18n, { type i18n as I18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/common.json'
import hi from './locales/hi/common.json'

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    hi: { translation: hi }
  },
  interpolation: { escapeValue: false }
})

export default i18n           
export type { I18n }           
export const supportedLangs = ['en', 'hi'] as const

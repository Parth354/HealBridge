import i18n, { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/common.json'
import hi from './locales/hi/common.json'

export const resources: Resource = { en: { common: en }, hi: { common: hi } }

export function initI18n(lng: 'en' | 'hi' = 'en') {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false }
    })
  }
  return i18n
}

export default i18n

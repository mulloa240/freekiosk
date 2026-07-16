import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * i18n del fork Somelier Kiosk.
 *
 * El codigo base (variables, arquitectura) se mantiene en ingles; solo los
 * textos VISIBLES para el operador del kiosko se traducen, y viven en los
 * archivos de recursos de ./locales en vez de estar hardcodeados en los
 * componentes. Asi la migracion de strings es incremental y queda la puerta
 * abierta a otros idiomas.
 *
 * El producto es primero en espanol, asi que 'es' es el idioma por defecto y
 * 'en' el fallback (cubre cualquier clave que aun no se haya traducido).
 */
i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;

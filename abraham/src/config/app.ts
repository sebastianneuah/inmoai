/**
 * App-level configuration and feature flags.
 * Integrations listed here are intentionally OFF until specs and credentials exist.
 */
export const appConfig = {
  name: 'ABRAHAM',
  locale: 'es-AR',
  currency: 'ARS',
  version: '0.1.0-prototipo',
  /** Shows "precios de demostración" notices across the UI. */
  demoPricing: true,
  /** Orders are stored locally and never reach a kitchen. */
  simulatedOrders: true,
  integrations: {
    supabase: false,
    fudo: false,
    mercadoPago: false,
    pushNotifications: false,
  },
} as const;

/**
 * Brand assets. When the official logo file is delivered, place it in /public/brand
 * and set `logoSrc` (e.g. "brand/abraham-logo.svg"). Until then a neutral typographic
 * placeholder is shown — it is NOT the official logo.
 */
export const brandConfig = {
  logoSrc: null as string | null,
  logoLightSrc: null as string | null,
};

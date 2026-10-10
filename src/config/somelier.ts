/*
 * Configuración de la plataforma Somelier para este fork.
 *
 * La URL base del kiosk-client es fija (una sola instancia sirve a toda la
 * flota); lo único que cambia por dispositivo es el token. Por eso en la UI el
 * usuario ingresa SOLO el token y la URL completa se arma sola
 * (`<base>/?token=<token>`), en vez de pedirle que pegue toda la URL a mano.
 *
 * Si en algún momento cambia el dominio del kiosk-client, se actualiza acá.
 */
// HTTPS: requerido para que el Service Worker del kiosk-client se registre y el
// caché de medios viva en DISCO (offline-first real). Sobre http:// el SW no se
// registra (contexto no seguro) y los binarios no persisten. Requiere TLS
// habilitado en Dokploy para estos dominios.
export const SOMELIER_BASE_URL = "https://kiosko.landriuss.cl";

// Dominios anteriores del kiosk-client. Las tablets emparejadas con ellos
// tienen la URL guardada con ese dominio; al leerla se reescribe al actual
// conservando el token (ver migrateSomelierUrl). El http:// es de antes de
// v1.2.24, cuando el kiosko todavía no tenía TLS.
const LEGACY_KIOSK_ORIGINS = [
  "https://somelier-kioskclient-hkrwfq-d87803-51-222-158-5.sslip.io",
  "http://somelier-kioskclient-hkrwfq-d87803-51-222-158-5.sslip.io",
];

// Base pública de admin-api, para la telemetría remota (observabilidad). El
// shell nativo reporta acá lo que el propio JS no puede (p. ej. pantalla en
// blanco por un WebView viejo que no ejecuta el bundle). Si queda vacío, la
// telemetría nativa se desactiva sin romper nada. HTTPS por la regla de
// contenido mixto (la página del kiosko será https).
export const SOMELIER_ADMIN_API_URL = "https://api.landriuss.cl";

/** Arma la URL completa del kiosk-client a partir del token del dispositivo. */
export function buildSomelierUrl(token: string): string {
  const trimmed = token.trim();
  return trimmed ? `${SOMELIER_BASE_URL}/?token=${encodeURIComponent(trimmed)}` : "";
}

/**
 * Pasa una URL del kiosk-client con un dominio viejo al dominio actual,
 * conservando ruta, token y demás parámetros. Cualquier otra URL (otro sitio,
 * o una ya migrada) vuelve sin cambios.
 */
export function migrateSomelierUrl(url: string): string {
  const lower = url.toLowerCase();
  for (const legacy of LEGACY_KIOSK_ORIGINS) {
    if (!lower.startsWith(legacy)) continue;
    const rest = url.slice(legacy.length);
    // Que el dominio termine ahí: "…sslip.io.otro.com" no es el kiosko.
    if (rest === "" || /^[/?#]/.test(rest)) return SOMELIER_BASE_URL + rest;
  }
  return url;
}

/** Endpoint de ingesta de telemetría (vacío si admin-api no está configurado). */
export function somelierTelemetryUrl(): string {
  const base = SOMELIER_ADMIN_API_URL.replace(/\/$/, "");
  return base ? `${base}/telemetry` : "";
}

/** Extrae el token de una URL ya guardada (para prellenar el campo). */
export function extractSomelierToken(url: string): string {
  const match = /[?&]token=([^&#]*)/.exec(url);
  return match ? decodeURIComponent(match[1]) : "";
}

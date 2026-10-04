/*
 * Configuración de la plataforma Somelier para este fork.
 *
 * La URL base del kiosk-client es fija (una sola instancia sirve a toda la
 * flota); lo único que cambia por dispositivo es el token. Por eso en la UI el
 * usuario ingresa SOLO el token y la URL completa se arma sola
 * (`<base>/?token=<token>`), en vez de pedirle que pegue toda la URL a mano.
 *
 * Si en algún momento cambia el dominio del kiosk-client, se actualiza acá.
 *
 * Dominio propio (mulloa.dev, DNS en Cloudflare → VPS en OVH). Antes eran los
 * hostnames `*.sslip.io`; esos siguen atendidos en paralelo en Dokploy mientras
 * haya tablets con la URL vieja guardada (cada una la tiene grabada junto a su
 * token), así que NO se retiran hasta migrar la flota. Orden de salida a
 * producción: DNS + dominios con TLS en Dokploy verificados ANTES de publicar
 * un APK con estas constantes — ver "Dominio propio" en el README de somelier.
 */
// HTTPS: requerido para que el Service Worker del kiosk-client se registre y el
// caché de medios viva en DISCO (offline-first real). Sobre http:// el SW no se
// registra (contexto no seguro) y los binarios no persisten. Requiere TLS
// habilitado en Dokploy para estos dominios.
export const SOMELIER_BASE_URL = "https://kiosk.mulloa.dev";

// Base pública de admin-api, para la telemetría remota (observabilidad). El
// shell nativo reporta acá lo que el propio JS no puede (p. ej. pantalla en
// blanco por un WebView viejo que no ejecuta el bundle). Si queda vacío, la
// telemetría nativa se desactiva sin romper nada. HTTPS por la regla de
// contenido mixto (la página del kiosko será https).
export const SOMELIER_ADMIN_API_URL = "https://api.mulloa.dev";

/** Arma la URL completa del kiosk-client a partir del token del dispositivo. */
export function buildSomelierUrl(token: string): string {
  const trimmed = token.trim();
  return trimmed ? `${SOMELIER_BASE_URL}/?token=${encodeURIComponent(trimmed)}` : "";
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

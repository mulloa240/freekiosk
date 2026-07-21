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
export const SOMELIER_BASE_URL = "http://somelier-kioskclient-hkrwfq-d87803-51-222-158-5.sslip.io";

// Base pública de admin-api, para la telemetría remota (observabilidad). El
// shell nativo reporta acá lo que el propio JS no puede (p. ej. pantalla en
// blanco por un WebView viejo que no ejecuta el bundle). Si queda vacío, la
// telemetría nativa se desactiva sin romper nada.
// TODO(confirmar): reemplazar por la URL pública real del servicio admin-api.
export const SOMELIER_ADMIN_API_URL = "";

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

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

/** Arma la URL completa del kiosk-client a partir del token del dispositivo. */
export function buildSomelierUrl(token: string): string {
  const trimmed = token.trim();
  return trimmed ? `${SOMELIER_BASE_URL}/?token=${encodeURIComponent(trimmed)}` : "";
}

/** Extrae el token de una URL ya guardada (para prellenar el campo). */
export function extractSomelierToken(url: string): string {
  const match = /[?&]token=([^&#]*)/.exec(url);
  return match ? decodeURIComponent(match[1]) : "";
}

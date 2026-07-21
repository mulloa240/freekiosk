/*
 * Telemetría remota del shell nativo (plataforma Somelier).
 *
 * Reporta a admin-api lo que el JS del kiosk-client NO puede auto-reportar:
 * sobre todo la "pantalla en blanco" cuando el WebView es tan viejo que ni
 * ejecuta el bundle (ahí window.onerror del propio SPA nunca corre). También
 * errores nativos del WebView (onError/onHttpError/renderProcessGone) y la
 * versión del WebView (vía el User-Agent que reporta el script inyectado).
 *
 * El deviceId no viaja: el backend lo deriva del token (device-JWT). Si
 * admin-api no está configurado (somelierTelemetryUrl vacío), es un no-op.
 */
import { Platform } from 'react-native';
import { extractSomelierToken, somelierTelemetryUrl } from '../config/somelier';

export type SomelierTelemetryKind =
  | 'native_error'
  | 'http_error'
  | 'render_gone'
  | 'webview_info'
  | 'js_error';

interface TelemetryExtra {
  message?: string;
  source?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
}

// Evita inundar admin-api si algo entra en loop (p. ej. reintentos de carga).
const lastSentAt: Record<string, number> = {};
const MIN_INTERVAL_MS = 5000;

function throttled(kind: string, message?: string): boolean {
  const key = `${kind}:${message ?? ''}`.slice(0, 200);
  const now = Date.now();
  const prev = lastSentAt[key];
  if (prev && now - prev < MIN_INTERVAL_MS) return true;
  lastSentAt[key] = now;
  return false;
}

/**
 * Envía un beacon de telemetría. `currentUrl` es la URL cargada en el WebView
 * (de ahí se extrae el token del dispositivo).
 */
export function postSomelierTelemetry(
  currentUrl: string,
  kind: SomelierTelemetryKind,
  extra: TelemetryExtra = {},
): void {
  const endpoint = somelierTelemetryUrl();
  if (!endpoint) return;
  const token = extractSomelierToken(currentUrl);
  if (!token) return;
  if (throttled(kind, extra.message)) return;

  const body = JSON.stringify({
    token,
    kind,
    origin: 'native',
    appVersion: `freekiosk-${Platform.OS}`,
    url: extra.url,
    userAgent: extra.userAgent,
    message: extra.message?.slice(0, 2000),
    source: extra.source?.slice(0, 500),
    stack: extra.stack?.slice(0, 4000),
  });

  // fetch con keepalive: sobrevive a un remount/recarga del WebView.
  fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort: la telemetría nunca debe romper el kiosko.
  });
}

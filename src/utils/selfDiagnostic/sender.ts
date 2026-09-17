import { SOMELIER_ADMIN_API_URL, extractSomelierToken } from '../../config/somelier';
import { StorageService } from '../storage';
import { diagnosticStore } from './store';
import type { DiagnosticReport } from './types';

/*
 * Envío del reporte a admin-api (`POST /telemetry/diagnostics`, device-JWT en
 * el cuerpo como la telemetría). Sin token o sin red, el reporte se encola y se
 * reintenta más tarde (arranque, vuelta a foreground, carga exitosa del
 * WebView) — en una caja con el reloj mal puesto el primer intento suele
 * fallar por TLS justo cuando más importa el reporte.
 */

export type SendOutcome = 'sent' | 'queued' | 'no_token' | 'disabled';

export function diagnosticsEndpoint(): string {
  const base = SOMELIER_ADMIN_API_URL.replace(/\/$/, '');
  return base ? `${base}/telemetry/diagnostics` : '';
}

async function currentToken(): Promise<string | undefined> {
  try {
    const url = await StorageService.getUrl();
    return url ? extractSomelierToken(url) : undefined;
  } catch {
    return undefined;
  }
}

async function post(endpoint: string, token: string, report: DiagnosticReport): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, report }),
    });
    // 4xx = el servidor lo rechazó (reporte inválido, token inválido): no tiene
    // sentido reintentar. 5xx/red = se reintenta.
    if (res.ok) return true;
    if (res.status >= 400 && res.status < 500) {
      console.warn(`[diag] admin-api rechazó el reporte (${res.status})`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function postDiagnosticReport(report: DiagnosticReport): Promise<SendOutcome> {
  const endpoint = diagnosticsEndpoint();
  if (!endpoint) return 'disabled';
  const token = await currentToken();
  if (!token) {
    await diagnosticStore.enqueuePending(report);
    return 'no_token';
  }
  if (await post(endpoint, token, report)) {
    await diagnosticStore.saveLastSent({
      reportId: report.reportId,
      sentAt: new Date().toISOString(),
      appVersion: report.app.versionName,
      verdict: report.verdict,
    });
    return 'sent';
  }
  await diagnosticStore.enqueuePending(report);
  return 'queued';
}

let lastFlushAt = 0;
let flushing = false;
const FLUSH_MIN_INTERVAL_MS = 5 * 60 * 1000;

/** Reintenta la cola. `force` salta el throttle (p. ej. botón manual). */
export async function flushPendingDiagnostics(force = false): Promise<number> {
  const now = Date.now();
  if (flushing) return 0;
  if (!force && now - lastFlushAt < FLUSH_MIN_INTERVAL_MS) return 0;
  const endpoint = diagnosticsEndpoint();
  if (!endpoint) return 0;
  flushing = true;
  lastFlushAt = now;
  try {
    const pending = await diagnosticStore.loadPending();
    if (pending.length === 0) return 0;
    const token = await currentToken();
    if (!token) return 0;
    const remaining: DiagnosticReport[] = [];
    let sent = 0;
    for (const report of pending) {
      if (await post(endpoint, token, report)) {
        sent += 1;
        await diagnosticStore.saveLastSent({
          reportId: report.reportId,
          sentAt: new Date().toISOString(),
          appVersion: report.app.versionName,
          verdict: report.verdict,
        });
      } else {
        remaining.push(report);
      }
    }
    await diagnosticStore.savePending(remaining);
    return sent;
  } finally {
    flushing = false;
  }
}

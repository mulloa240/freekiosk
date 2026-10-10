import { buildProbeScript, isProbeMessage, parseProbeResult } from './probeScript';
import type { ProbeSection } from './types';

/*
 * Puente entre el orquestador y el WebView que ejecuta la sonda. El WebView
 * del kiosko registra un "runner" (inyecta JS) mientras está montado; los
 * resultados vuelven por onMessage y se resuelven acá por requestId. La
 * pantalla de Ajustes/Emparejamiento puede pasar su propio runner (WebView
 * oculto) para no depender del kiosko.
 */

export type ProbeRunner = (script: string, requestId: string) => boolean;

let registeredRunner: ProbeRunner | undefined;
// WebView oculto montado en la raíz de la app (DiagnosticProbeHost): se usa
// cuando el del kiosko no está o no puede correr la sonda (pantalla de error,
// visor de PDF).
let fallbackRunner: ProbeRunner | undefined;
const pending = new Map<string, (section: ProbeSection) => void>();

export const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

export function registerProbeRunner(runner: ProbeRunner): void {
  registeredRunner = runner;
}

export function unregisterProbeRunner(runner: ProbeRunner): void {
  if (registeredRunner === runner) registeredRunner = undefined;
}

export function registerFallbackProbeRunner(runner: ProbeRunner): void {
  fallbackRunner = runner;
}

export function unregisterFallbackProbeRunner(runner: ProbeRunner): void {
  if (fallbackRunner === runner) fallbackRunner = undefined;
}

export function hasProbeRunner(): boolean {
  return registeredRunner !== undefined || fallbackRunner !== undefined;
}

/** Llamar desde onMessage del WebView con el JSON ya parseado. Devuelve true si era una sonda. */
export function resolveProbeResult(data: unknown): boolean {
  if (!isProbeMessage(data)) return false;
  const resolve = pending.get(data.requestId);
  if (!resolve) return true;
  pending.delete(data.requestId);
  resolve(parseProbeResult(data));
  return true;
}

function newRequestId(): string {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export interface RunProbeOptions {
  timeoutMs?: number;
  runner?: ProbeRunner;
}

/** Ejecuta la sonda y espera el resultado; `ran: false` si no hay dónde correrla o expira. */
export function runProbe(options: RunProbeOptions = {}): Promise<ProbeSection> {
  const runners = (options.runner ? [options.runner] : [registeredRunner, fallbackRunner]).filter(
    (r): r is ProbeRunner => r !== undefined,
  );
  if (runners.length === 0) return Promise.resolve({ ran: false });
  const requestId = newRequestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;

  return new Promise<ProbeSection>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({ ran: false });
    }, timeoutMs);
    pending.set(requestId, (section) => {
      clearTimeout(timer);
      resolve(section);
    });
    const script = buildProbeScript(requestId);
    let started = false;
    for (const runner of runners) {
      try {
        started = runner(script, requestId);
      } catch {
        started = false;
      }
      if (started) break;
    }
    if (!started) {
      clearTimeout(timer);
      pending.delete(requestId);
      resolve({ ran: false });
    }
  });
}

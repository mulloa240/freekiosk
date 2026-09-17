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
const pending = new Map<string, (section: ProbeSection) => void>();

export function registerProbeRunner(runner: ProbeRunner): void {
  registeredRunner = runner;
}

export function unregisterProbeRunner(runner: ProbeRunner): void {
  if (registeredRunner === runner) registeredRunner = undefined;
}

export function hasProbeRunner(): boolean {
  return registeredRunner !== undefined;
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
  const runner = options.runner ?? registeredRunner;
  if (!runner) return Promise.resolve({ ran: false });
  const requestId = newRequestId();
  const timeoutMs = options.timeoutMs ?? 8000;

  return new Promise<ProbeSection>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({ ran: false });
    }, timeoutMs);
    pending.set(requestId, (section) => {
      clearTimeout(timer);
      resolve(section);
    });
    let started = false;
    try {
      started = runner(buildProbeScript(requestId), requestId);
    } catch {
      started = false;
    }
    if (!started) {
      clearTimeout(timer);
      pending.delete(requestId);
      resolve({ ran: false });
    }
  });
}

/*
 * Tipos del auto-diagnóstico de compatibilidad (plataforma Somelier).
 *
 * Copia manual del contrato zod `packages/contracts/src/diagnostics.ts` del
 * repo somelier: cualquier cambio de forma debe reflejarse allá (y subir
 * `schemaVersion` si deja de ser compatible).
 */

export const DIAGNOSTIC_SCHEMA_VERSION = 1 as const;

export type DiagnosticVerdict = 'compatible' | 'compatible_with_limitations' | 'not_compatible';
export type DiagnosticTrigger = 'manual' | 'auto' | 'remote';
export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';
// compat: afecta si el kiosko puede funcionar en este equipo.
// setup: configuración pendiente (permisos, red, emparejamiento).
export type CheckImpact = 'compat' | 'setup';

export interface DiagnosticCheck {
  id: string;
  status: CheckStatus;
  impact: CheckImpact;
  value?: string | number | boolean;
  detail?: string;
}

export interface EndpointProbe {
  ok: boolean;
  status?: number;
  ms?: number;
  errorClass?: 'tls' | 'dns' | 'timeout' | 'http' | 'other';
  error?: string;
  // Solo en el snapshot nativo (no viaja al servidor): cabecera Date.
  serverDateMs?: number;
}

/** Lo que devuelve DiagnosticsModule.collect() (capa nativa). */
export interface NativeDiagnosticsSnapshot {
  device: {
    manufacturer?: string;
    brand?: string;
    model?: string;
    device?: string;
    product?: string;
    hardware?: string;
    board?: string;
    fingerprint?: string;
    androidVersion?: string;
    apiLevel?: number;
    firstApiLevel?: number;
    securityPatch?: string;
    kernel?: string;
    abis?: string[];
    cpuCores?: number;
    uptimeSec?: number;
    isTv?: boolean;
    leanback?: boolean;
    touchscreen?: boolean;
    faketouch?: boolean;
    hasDpad?: boolean;
    screen?: { w?: number; h?: number; dpi?: number; density?: number };
  };
  memory: {
    totalMB?: number;
    availableMB?: number;
    usedMB?: number;
    usedPercent?: number;
    lowMemory?: boolean;
    memoryClassMB?: number;
    largeMemoryClassMB?: number;
  };
  storage: { totalMB?: number; availableMB?: number; usedMB?: number; usedPercent?: number };
  webview: {
    packageName?: string;
    versionName?: string;
    chromeMajor?: number;
    source?: string;
    defaultUserAgent?: string;
    gmsPresent?: boolean;
    candidates?: string[];
  };
  permissions: {
    deviceOwner?: boolean;
    lockTaskPermitted?: boolean;
    accessibility?: boolean;
    overlay?: boolean;
    usageStats?: boolean;
    installPackages?: boolean;
    batteryOptimizationIgnored?: boolean;
    writeSecureSettings?: boolean;
  };
  clock: { nowMs?: number; buildTimeMs?: number; autoTime?: boolean; timezone?: string };
  app: {
    versionName?: string;
    versionCode?: number;
    selfUpdate?: boolean;
    installer?: string;
    firstInstallTimeMs?: number;
  };
  network: {
    type?: string;
    kioskClient?: EndpointProbe;
    adminApi?: EndpointProbe;
    plainHttp?: EndpointProbe;
  };
}

export interface ProbeResults {
  [key: string]: unknown;
}

export interface ProbeSection {
  ran: boolean;
  ms?: number;
  origin?: string;
  uaInPage?: string;
  results?: ProbeResults;
}

export interface NetworkSection {
  type?: string;
  kioskClient?: EndpointProbe;
  adminApi?: EndpointProbe;
  clockSkewSec?: number;
  clockBeforeBuild?: boolean;
  autoTime?: boolean;
  timezone?: string;
}

export interface DiagnosticSummary {
  headline: string;
  failed: string[];
  warned: string[];
  setupIssues: string[];
}

export interface DiagnosticReport {
  schemaVersion: typeof DIAGNOSTIC_SCHEMA_VERSION;
  reportId: string;
  generatedAt: string;
  trigger: DiagnosticTrigger;
  commandId?: string;
  durationMs?: number;
  app: {
    versionName?: string;
    versionCode?: number;
    selfUpdate?: boolean;
    displayMode?: string;
    paired?: boolean;
    installId?: string;
  };
  device: NativeDiagnosticsSnapshot['device'] & { versionConsistent?: boolean };
  memory: {
    totalMB?: number;
    availableMB?: number;
    lowMemory?: boolean;
    memoryClassMB?: number;
    largeMemoryClassMB?: number;
    storageTotalMB?: number;
    storageFreeMB?: number;
  };
  webview: NativeDiagnosticsSnapshot['webview'];
  permissions: NativeDiagnosticsSnapshot['permissions'];
  network: NetworkSection;
  probe: ProbeSection;
  checks: DiagnosticCheck[];
  verdict: DiagnosticVerdict;
  summary: DiagnosticSummary;
}

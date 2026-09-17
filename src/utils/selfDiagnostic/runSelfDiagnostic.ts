import { SOMELIER_ADMIN_API_URL, SOMELIER_BASE_URL, extractSomelierToken } from '../../config/somelier';
import DiagnosticsModule from '../DiagnosticsModule';
import { getInstallId } from '../somelierPairing';
import { StorageService } from '../storage';
import { buildChecks } from './checks';
import { buildNetworkSection } from './network';
import { runProbe, type ProbeRunner } from './probeBus';
import { diagnosticStore } from './store';
import { DIAGNOSTIC_SCHEMA_VERSION, type DiagnosticReport, type DiagnosticTrigger, type NativeDiagnosticsSnapshot } from './types';
import { buildSummary, computeVerdict } from './verdict';

export type DiagnosticStep = 'native' | 'network' | 'probe' | 'evaluate' | 'done';

export interface RunOptions {
  trigger: DiagnosticTrigger;
  commandId?: string;
  probeRunner?: ProbeRunner;
  probeTimeoutMs?: number;
  onProgress?: (step: DiagnosticStep) => void;
}

function newReportId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(16)}`;
}

function plainHttpUrl(adminApiUrl: string): string {
  // Mismo host por http:// (sin TLS) solo para leer la cabecera Date.
  return `${adminApiUrl.replace(/^https:\/\//, 'http://').replace(/\/$/, '')}/health`;
}

let inFlight: Promise<DiagnosticReport> | undefined;

/**
 * Ejecuta el auto-diagnóstico completo y guarda el reporte localmente. Una
 * sola ejecución en vuelo: llamadas concurrentes comparten la misma promesa.
 */
export function runSelfDiagnostic(options: RunOptions): Promise<DiagnosticReport> {
  if (inFlight) return inFlight;
  inFlight = execute(options).finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

export function isDiagnosticRunning(): boolean {
  return inFlight !== undefined;
}

async function execute(options: RunOptions): Promise<DiagnosticReport> {
  const started = Date.now();
  const progress = options.onProgress ?? (() => {});

  progress('native');
  const adminBase = SOMELIER_ADMIN_API_URL.replace(/\/$/, '');
  const snapshot = (await DiagnosticsModule.collect(
    SOMELIER_BASE_URL,
    adminBase ? `${adminBase}/health` : '',
    adminBase ? plainHttpUrl(adminBase) : '',
  )) as NativeDiagnosticsSnapshot;

  progress('network');
  const network = buildNetworkSection(snapshot);

  progress('probe');
  const probe = await runProbe({ runner: options.probeRunner, timeoutMs: options.probeTimeoutMs });

  progress('evaluate');
  const [url, displayMode, installId] = await Promise.all([
    StorageService.getUrl().catch(() => null),
    StorageService.getDisplayMode().catch(() => undefined),
    getInstallId().catch(() => undefined),
  ]);
  const paired = Boolean(url && extractSomelierToken(url));

  const checks = buildChecks({ snapshot, network, probe, paired, displayMode });
  const verdict = computeVerdict(checks);
  const summary = buildSummary(checks, verdict);
  const inconsistent = checks.find((c) => c.id === 'device.versionConsistency')?.status === 'warn';

  const report: DiagnosticReport = {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    reportId: newReportId(),
    generatedAt: new Date().toISOString(),
    trigger: options.trigger,
    commandId: options.commandId,
    durationMs: Date.now() - started,
    app: {
      versionName: snapshot.app?.versionName,
      versionCode: snapshot.app?.versionCode,
      selfUpdate: snapshot.app?.selfUpdate,
      displayMode,
      paired,
      installId,
    },
    device: { ...snapshot.device, versionConsistent: !inconsistent },
    memory: {
      totalMB: snapshot.memory?.totalMB,
      availableMB: snapshot.memory?.availableMB,
      lowMemory: snapshot.memory?.lowMemory,
      memoryClassMB: snapshot.memory?.memoryClassMB,
      largeMemoryClassMB: snapshot.memory?.largeMemoryClassMB,
      storageTotalMB: snapshot.storage?.totalMB,
      storageFreeMB: snapshot.storage?.availableMB,
    },
    webview: snapshot.webview ?? {},
    permissions: snapshot.permissions ?? {},
    network,
    probe,
    checks,
    verdict,
    summary,
  };

  await diagnosticStore.saveLastReport(report);
  progress('done');
  return report;
}

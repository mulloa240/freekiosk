import { hasProbeRunner } from './probeBus';
import { runSelfDiagnostic } from './runSelfDiagnostic';
import { flushPendingDiagnostics, postDiagnosticReport } from './sender';
import { diagnosticStore } from './store';
import UpdateModule from '../UpdateModule';

/*
 * Política de ejecución automática: una vez tras emparejar, la primera vez que
 * la app corre con soporte, y cada vez que cambia la versión de la app. Así el
 * portal tiene un reporte de cada equipo sin que nadie toque un botón.
 */

const MIN_AUTO_INTERVAL_MS = 10 * 60 * 1000;

async function shouldAutoRun(): Promise<boolean> {
  if (await diagnosticStore.isDue()) return true;
  const lastSent = await diagnosticStore.loadLastSent();
  if (!lastSent) return true;
  try {
    const { versionName } = await UpdateModule.getCurrentVersion();
    return Boolean(versionName) && versionName !== lastSent.appVersion;
  } catch {
    return false;
  }
}

async function recentlyRan(): Promise<boolean> {
  const last = await diagnosticStore.loadLastReport();
  if (!last) return false;
  const at = Date.parse(last.generatedAt);
  return Number.isFinite(at) && Date.now() - at < MIN_AUTO_INTERVAL_MS && last.trigger !== 'manual';
}

/** Llamar al arrancar (con retardo) y cuando el WebView del kiosko ya cargó. */
export async function maybeAutoRunDiagnostic(): Promise<void> {
  try {
    await flushPendingDiagnostics();
    if (!(await shouldAutoRun())) return;
    if (await recentlyRan()) return;
    const report = await runSelfDiagnostic({
      trigger: 'auto',
      // Si el WebView del kiosko no está montado, la sonda queda en skip; el
      // resto del reporte sigue siendo útil.
      probeTimeoutMs: hasProbeRunner() ? 8000 : 0,
    });
    const outcome = await postDiagnosticReport(report);
    if (outcome === 'sent') await diagnosticStore.clearDue();
  } catch (err) {
    console.warn('[diag] auto-diagnóstico falló:', err);
  }
}

/** Petición remota (comando run_diagnostics del portal, vía SOMELIER_DIAG_REQUEST). */
export async function runRemoteDiagnostic(commandId?: string): Promise<void> {
  try {
    if (await recentlyRan()) {
      // Reenvía el último reporte en vez de ejecutar de nuevo (throttle).
      const last = await diagnosticStore.loadLastReport();
      if (last) {
        await postDiagnosticReport({ ...last, trigger: 'remote', commandId, reportId: `${last.reportId}-r` });
        return;
      }
    }
    const report = await runSelfDiagnostic({ trigger: 'remote', commandId });
    await postDiagnosticReport(report);
  } catch (err) {
    console.warn('[diag] diagnóstico remoto falló:', err);
  }
}

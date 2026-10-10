import { buildSummary, computeVerdict } from '../../src/utils/selfDiagnostic/verdict';
import type { DiagnosticCheck } from '../../src/utils/selfDiagnostic/types';

const c = (id: string, status: DiagnosticCheck['status'], impact: DiagnosticCheck['impact'], detail?: string): DiagnosticCheck => ({
  id,
  status,
  impact,
  detail,
});

describe('computeVerdict / buildSummary', () => {
  it('todo ok → compatible', () => {
    const checks = [c('a', 'ok', 'compat'), c('b', 'ok', 'setup'), c('c', 'skip', 'setup')];
    expect(computeVerdict(checks)).toBe('compatible');
    expect(buildSummary(checks, 'compatible').headline).toMatch(/Compatible/);
  });

  it('un fail de compatibilidad → no compatible, con su detalle como titular', () => {
    const checks = [c('webview.version', 'fail', 'compat', 'WebView demasiado viejo'), c('perm.x', 'warn', 'setup')];
    expect(computeVerdict(checks)).toBe('not_compatible');
    const summary = buildSummary(checks, 'not_compatible');
    expect(summary.headline).toBe('WebView demasiado viejo');
    expect(summary.failed).toEqual(['webview.version']);
    expect(summary.setupIssues).toEqual(['perm.x']);
  });

  it('un warn de compatibilidad → con limitaciones, con su detalle como titular', () => {
    const checks = [c('memory.total', 'warn', 'compat', 'Menos de 2 GB de RAM'), c('perm.x', 'warn', 'setup')];
    expect(computeVerdict(checks)).toBe('compatible_with_limitations');
    expect(buildSummary(checks, 'compatible_with_limitations').headline).toBe('Menos de 2 GB de RAM');
  });

  it('lo de configuración no baja el veredicto: compatible, con lo pendiente en el titular', () => {
    const checks = [c('a', 'ok', 'compat'), c('net.type', 'fail', 'setup'), c('perm.deviceOwner', 'warn', 'setup')];
    expect(computeVerdict(checks)).toBe('compatible');
    const summary = buildSummary(checks, 'compatible');
    expect(summary.headline).toBe('Compatible; pendiente de configuración: net.type, perm.deviceOwner');
    expect(summary.setupIssues).toEqual(['net.type', 'perm.deviceOwner']);
  });
});

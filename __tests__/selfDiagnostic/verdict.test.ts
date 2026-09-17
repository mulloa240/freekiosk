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

  it('un warn de compatibilidad o un fail de configuración → con limitaciones', () => {
    expect(computeVerdict([c('memory.total', 'warn', 'compat')])).toBe('compatible_with_limitations');
    expect(computeVerdict([c('net.type', 'fail', 'setup')])).toBe('compatible_with_limitations');
    const summary = buildSummary([c('net.type', 'fail', 'setup')], 'compatible_with_limitations');
    expect(summary.headline).toMatch(/pendiente de configuración: net.type/);
  });
});

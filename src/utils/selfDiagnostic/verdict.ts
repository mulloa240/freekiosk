import type { DiagnosticCheck, DiagnosticSummary, DiagnosticVerdict } from './types';

export function computeVerdict(checks: DiagnosticCheck[]): DiagnosticVerdict {
  if (checks.some((c) => c.impact === 'compat' && c.status === 'fail')) return 'not_compatible';
  const limited = checks.some(
    (c) => (c.impact === 'compat' && c.status === 'warn') || (c.impact === 'setup' && (c.status === 'warn' || c.status === 'fail')),
  );
  return limited ? 'compatible_with_limitations' : 'compatible';
}

export function buildSummary(checks: DiagnosticCheck[], verdict: DiagnosticVerdict): DiagnosticSummary {
  const failed = checks.filter((c) => c.impact === 'compat' && c.status === 'fail').map((c) => c.id);
  const warned = checks.filter((c) => c.impact === 'compat' && c.status === 'warn').map((c) => c.id);
  const setupIssues = checks.filter((c) => c.impact === 'setup' && (c.status === 'warn' || c.status === 'fail')).map((c) => c.id);

  let headline: string;
  if (verdict === 'not_compatible') {
    const first = checks.find((c) => c.id === failed[0]);
    headline = first?.detail ?? `No compatible: ${failed.join(', ')}`;
  } else if (verdict === 'compatible_with_limitations') {
    if (warned.length > 0) {
      const first = checks.find((c) => c.id === warned[0]);
      headline = first?.detail ?? `Compatible con limitaciones: ${warned.join(', ')}`;
    } else {
      headline = `Compatible; pendiente de configuración: ${setupIssues.join(', ')}`;
    }
  } else {
    headline = 'Compatible con el kiosko Somelier';
  }

  return { headline: headline.slice(0, 200), failed, warned, setupIssues };
}

import type { DiagnosticCheck, DiagnosticSummary, DiagnosticVerdict } from './types';

/**
 * El veredicto habla solo del EQUIPO (checks `compat`). Lo de configuración
 * (permisos, red, emparejamiento) se arregla sin cambiar de equipo y va
 * aparte, en `summary.setupIssues` y en el titular: antes cualquier permiso
 * pendiente dejaba "con limitaciones" a toda la flota, incluso a tablets
 * nuevas, y el veredicto no distinguía nada.
 */
export function computeVerdict(checks: DiagnosticCheck[]): DiagnosticVerdict {
  if (checks.some((c) => c.impact === 'compat' && c.status === 'fail')) return 'not_compatible';
  const limited = checks.some((c) => c.impact === 'compat' && c.status === 'warn');
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
    const first = checks.find((c) => c.id === warned[0]);
    headline = first?.detail ?? `Compatible con limitaciones: ${warned.join(', ')}`;
  } else if (setupIssues.length > 0) {
    headline = `Compatible; pendiente de configuración: ${setupIssues.join(', ')}`;
  } else {
    headline = 'Compatible con el kiosko Catas';
  }

  return { headline: headline.slice(0, 200), failed, warned, setupIssues };
}

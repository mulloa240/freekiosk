import type { EndpointProbe, NativeDiagnosticsSnapshot, NetworkSection } from './types';

// Las sondas HTTP las hace la capa nativa (HttpURLConnection distingue TLS de
// DNS de timeout; el fetch de JS no). Acá solo se arma la sección de red del
// reporte y se calcula el desfase de reloj.

function stripServerDate(probe: EndpointProbe | undefined): EndpointProbe | undefined {
  if (!probe) return undefined;
  const rest: EndpointProbe = { ...probe };
  delete rest.serverDateMs;
  return rest;
}

/**
 * Desfase del reloj del equipo respecto del servidor (segundos, positivo =
 * equipo adelantado). Se toma la primera cabecera Date disponible; la sonda
 * por http plano responde aunque TLS esté roto, que es justamente el caso de
 * un reloj muy atrasado.
 */
export function computeClockSkewSec(snapshot: NativeDiagnosticsSnapshot): number | undefined {
  const now = snapshot.clock?.nowMs;
  if (typeof now !== 'number') return undefined;
  const probes = [snapshot.network?.adminApi, snapshot.network?.kioskClient, snapshot.network?.plainHttp];
  for (const probe of probes) {
    if (probe && typeof probe.serverDateMs === 'number' && probe.serverDateMs > 0) {
      return Math.round((now - probe.serverDateMs) / 1000);
    }
  }
  return undefined;
}

export function buildNetworkSection(snapshot: NativeDiagnosticsSnapshot): NetworkSection {
  const now = snapshot.clock?.nowMs;
  const build = snapshot.clock?.buildTimeMs;
  return {
    type: snapshot.network?.type,
    kioskClient: stripServerDate(snapshot.network?.kioskClient),
    adminApi: stripServerDate(snapshot.network?.adminApi),
    clockSkewSec: computeClockSkewSec(snapshot),
    clockBeforeBuild: typeof now === 'number' && typeof build === 'number' && build > 0 ? now < build : undefined,
    autoTime: snapshot.clock?.autoTime,
    timezone: snapshot.clock?.timezone,
  };
}

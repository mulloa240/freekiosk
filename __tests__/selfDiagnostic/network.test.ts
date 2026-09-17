import { buildNetworkSection, computeClockSkewSec } from '../../src/utils/selfDiagnostic/network';
import { fakeAndroid13BoxSnapshot, healthySnapshot } from '../../src/utils/selfDiagnostic/__fixtures__/snapshots';

describe('buildNetworkSection', () => {
  it('toma el desfase de la primera cabecera Date disponible y no filtra serverDateMs al reporte', () => {
    const snapshot = healthySnapshot();
    const section = buildNetworkSection(snapshot);
    expect(section.clockSkewSec).toBe(1); // adminApi: ahora − (ahora − 1000 ms)
    expect(section.clockBeforeBuild).toBe(false);
    expect((section.adminApi as { serverDateMs?: number }).serverDateMs).toBeUndefined();
    expect(section.type).toBe('wifi');
  });

  it('con TLS roto usa la sonda por http plano para medir el reloj', () => {
    const snapshot = fakeAndroid13BoxSnapshot();
    expect(computeClockSkewSec(snapshot)).toBe(Math.round((1_262_304_000_000 - 1_800_000_000_000) / 1000));
    expect(buildNetworkSection(snapshot).clockBeforeBuild).toBe(true);
  });

  it('sin Date ni reloj deja el desfase indefinido', () => {
    const snapshot = healthySnapshot({ network: { type: 'none' }, clock: {} });
    const section = buildNetworkSection(snapshot);
    expect(section.clockSkewSec).toBeUndefined();
    expect(section.clockBeforeBuild).toBeUndefined();
  });
});

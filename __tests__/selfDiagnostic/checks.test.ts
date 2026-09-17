import { buildChecks, versionInconsistencies, parseKernel } from '../../src/utils/selfDiagnostic/checks';
import { buildNetworkSection } from '../../src/utils/selfDiagnostic/network';
import { FULL_PROBE, fakeAndroid13BoxSnapshot, healthySnapshot } from '../../src/utils/selfDiagnostic/__fixtures__/snapshots';

const byId = (checks: ReturnType<typeof buildChecks>) => new Map(checks.map((c) => [c.id, c]));

describe('buildChecks', () => {
  it('un tablet moderno sano pasa todo en ok', () => {
    const snapshot = healthySnapshot();
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true, displayMode: 'webview' });
    const notOk = checks.filter((c) => c.status !== 'ok');
    expect(notOk).toEqual([]);
    expect(checks.length).toBeGreaterThan(20);
  });

  it('una caja "Android 13" falseada sobre 7.1 con WebView 58 falla por el WebView y avisa por la versión', () => {
    const snapshot = fakeAndroid13BoxSnapshot();
    const network = buildNetworkSection(snapshot);
    const map = byId(buildChecks({ snapshot, network, probe: { ran: false }, paired: false, displayMode: 'webview' }));

    expect(map.get('webview.version')?.status).toBe('fail');
    expect(map.get('device.versionConsistency')?.status).toBe('warn');
    expect(map.get('device.versionConsistency')?.detail).toMatch(/API level real es 25/);
    expect(map.get('device.versionConsistency')?.detail).toMatch(/kernel 3.14/);
    expect(map.get('android.api')?.status).toBe('warn');
    expect(map.get('device.abi')?.status).toBe('warn');
    expect(map.get('device.touch')?.status).toBe('warn');
    expect(map.get('memory.total')?.status).toBe('warn');
    expect(map.get('webview.updatable')?.status).toBe('warn');
    expect(map.get('probe.run')?.status).toBe('skip');
    expect(map.get('net.kioskClient')?.status).toBe('fail');
    expect(map.get('net.kioskClient')?.detail).toMatch(/TLS/);
    // Reloj en 2010: anterior al build → fail, medido por la sonda http plana.
    expect(map.get('net.clock')?.status).toBe('fail');
    expect(map.get('net.clock')?.value).toBe('before-build');
    expect(map.get('app.paired')?.status).toBe('warn');
    expect(map.get('perm.deviceOwner')?.status).toBe('warn');
  });

  it('infiere el Chrome major desde la sonda cuando no hay User-Agent por defecto', () => {
    const snapshot = healthySnapshot({ webview: { packageName: 'com.android.webview', source: 'candidate', gmsPresent: false } });
    const legacy = byId(
      buildChecks({
        snapshot,
        network: buildNetworkSection(snapshot),
        probe: { ran: true, results: { ...FULL_PROBE.results, optionalChaining: false } },
        paired: true,
      }),
    );
    expect(legacy.get('webview.version')?.status).toBe('warn');
    expect(legacy.get('webview.version')?.value).toBe(61);

    const unknown = byId(buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: { ran: false }, paired: true }));
    expect(unknown.get('webview.version')?.status).toBe('warn');
    expect(unknown.get('webview.version')?.detail).toMatch(/No se pudo identificar/);
  });

  it('memoria y almacenamiento por debajo del mínimo fallan', () => {
    const snapshot = healthySnapshot({
      memory: { totalMB: 512, availableMB: 100, lowMemory: true, memoryClassMB: 96, largeMemoryClassMB: 128 },
      storage: { totalMB: 4000, availableMB: 100 },
    });
    const map = byId(buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true }));
    expect(map.get('memory.total')?.status).toBe('fail');
    expect(map.get('memory.class')?.status).toBe('warn');
    expect(map.get('memory.lowNow')?.status).toBe('warn');
    expect(map.get('storage.free')?.status).toBe('fail');
  });

  it('desfase de reloj: warn a los 5 min, fail a partir de un día', () => {
    const now = 1_800_000_000_000;
    const mk = (skewMs: number) =>
      healthySnapshot({
        clock: { nowMs: now, buildTimeMs: now - 1000, autoTime: true },
        network: { type: 'wifi', adminApi: { ok: true, status: 200, ms: 50, serverDateMs: now - skewMs } },
      });
    const status = (s: ReturnType<typeof healthySnapshot>) =>
      byId(buildChecks({ snapshot: s, network: buildNetworkSection(s), probe: FULL_PROBE, paired: true })).get('net.clock')?.status;
    expect(status(mk(10_000))).toBe('ok');
    expect(status(mk(10 * 60 * 1000))).toBe('warn');
    expect(status(mk(2 * 24 * 3600 * 1000))).toBe('fail');
  });
});

describe('versionInconsistencies', () => {
  it('no marca nada en un equipo coherente', () => {
    expect(versionInconsistencies({ androidVersion: '9', apiLevel: 28, kernel: '4.9.113' }, { chromeMajor: 69 })).toEqual([]);
    expect(versionInconsistencies({ androidVersion: '7.1.2', apiLevel: 25, kernel: '3.14.29' }, { chromeMajor: 58 })).toEqual([]);
  });

  it('detecta build.prop falseado por API, kernel y WebView', () => {
    const reasons = versionInconsistencies({ androidVersion: '13', apiLevel: 28, kernel: '4.9.113' }, { chromeMajor: 69 });
    expect(reasons).toHaveLength(3);
  });

  it('parseKernel tolera formatos raros', () => {
    expect(parseKernel('4.9.113-g1234')).toEqual([4, 9]);
    expect(parseKernel('')).toBeUndefined();
    expect(parseKernel(undefined)).toBeUndefined();
  });
});

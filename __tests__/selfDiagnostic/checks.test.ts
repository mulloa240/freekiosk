import { buildChecks, versionInconsistencies, parseKernel } from '../../src/utils/selfDiagnostic/checks';
import { buildNetworkSection } from '../../src/utils/selfDiagnostic/network';
import { computeVerdict } from '../../src/utils/selfDiagnostic/verdict';
import {
  FULL_PROBE,
  fakeAndroid13BoxSnapshot,
  healthySnapshot,
  samsungUpgradedSnapshot,
  sanciTvBoxSnapshot,
} from '../../src/utils/selfDiagnostic/__fixtures__/snapshots';

const byId = (checks: ReturnType<typeof buildChecks>) => new Map(checks.map((c) => [c.id, c]));

describe('buildChecks', () => {
  it('un tablet moderno sano pasa todo en ok', () => {
    const snapshot = healthySnapshot();
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true, displayMode: 'webview' });
    const notOk = checks.filter((c) => c.status !== 'ok');
    expect(notOk).toEqual([]);
    expect(checks.length).toBeGreaterThan(20);
  });

  it('una caja "Android 13" falseada sobre 7.1 con WebView 58 falla por el WebView; la versión falsa queda informada', () => {
    const snapshot = fakeAndroid13BoxSnapshot();
    const network = buildNetworkSection(snapshot);
    const map = byId(buildChecks({ snapshot, network, probe: { ran: false }, paired: false, displayMode: 'webview' }));

    expect(map.get('webview.version')?.status).toBe('fail');
    // Informativo: lo que decide es el API y el WebView reales, ya evaluados.
    expect(map.get('device.versionConsistency')?.status).toBe('ok');
    expect(map.get('device.versionConsistency')?.detail).toMatch(/API level real es 25/);
    expect(map.get('device.versionConsistency')?.detail).toMatch(/kernel 3.14/);
    expect(map.get('android.api')?.status).toBe('warn');
    expect(map.get('device.abi')?.status).toBe('warn');
    // TV con control remoto: no tener táctil es lo esperado.
    expect(map.get('device.touch')?.status).toBe('ok');
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

  it('Samsung SM-T515 actualizada de 9 a 11 con kernel 4.4: compatible, sin falso aviso de kernel', () => {
    const snapshot = samsungUpgradedSnapshot();
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true, displayMode: 'webview' });
    const map = byId(checks);
    expect(map.get('device.versionConsistency')?.detail).toBeUndefined();
    expect(computeVerdict(checks)).toBe('compatible');
  });

  it('TV box Sanci SC-TV114 ("15.0" sobre API 29, WebView 101): compatible; la versión falsa queda a la vista', () => {
    const snapshot = sanciTvBoxSnapshot();
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true, displayMode: 'webview' });
    const map = byId(checks);
    expect(map.get('device.versionConsistency')?.status).toBe('ok');
    expect(map.get('device.versionConsistency')?.detail).toMatch(/declara Android 15 pero el API level real es 29/);
    expect(map.get('device.touch')?.status).toBe('ok');
    expect(map.get('webview.version')?.status).toBe('ok');
    // Device Owner y superposición pendientes: configuración, no compatibilidad.
    expect(map.get('perm.deviceOwner')?.status).toBe('warn');
    expect(computeVerdict(checks)).toBe('compatible');
  });

  it('sin táctil y sin control remoto sí avisa', () => {
    const snapshot = healthySnapshot({ device: { ...healthySnapshot().device, touchscreen: false, isTv: false, hasDpad: false } });
    const map = byId(buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe: FULL_PROBE, paired: true }));
    expect(map.get('device.touch')?.status).toBe('warn');
  });

  it('sonda fuera del kiosko (about:blank): serviceWorker y localStorage quedan sin medir, no "No compatible"', () => {
    const snapshot = healthySnapshot();
    const probe = {
      ran: true,
      origin: 'null',
      results: { ...FULL_PROBE.results, secureContext: false, serviceWorker: false, localStorage: false },
    };
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe, paired: true, displayMode: 'webview' });
    const map = byId(checks);
    expect(map.get('probe.serviceWorker')?.status).toBe('skip');
    expect(map.get('probe.localStorage')?.status).toBe('skip');
    expect(map.get('probe.localStorage')?.detail).toMatch(/fuera del kiosko/);
    expect(computeVerdict(checks)).toBe('compatible');
  });

  it('sin Service Worker en el kiosko: aviso (sin modo offline), no incompatibilidad', () => {
    const snapshot = healthySnapshot();
    const probe = { ...FULL_PROBE, results: { ...FULL_PROBE.results, serviceWorker: false } };
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe, paired: true, displayMode: 'webview' });
    expect(byId(checks).get('probe.serviceWorker')?.status).toBe('warn');
    expect(computeVerdict(checks)).toBe('compatible_with_limitations');
  });

  it('sin aspect-ratio ni WebGL: informativo, no baja el veredicto', () => {
    const snapshot = healthySnapshot();
    const probe = { ...FULL_PROBE, results: { ...FULL_PROBE.results, cssAspectRatio: false, webgl: false } };
    const checks = buildChecks({ snapshot, network: buildNetworkSection(snapshot), probe, paired: true, displayMode: 'webview' });
    const map = byId(checks);
    expect(map.get('probe.cssAspectRatio')?.status).toBe('ok');
    expect(map.get('probe.cssAspectRatio')?.detail).toMatch(/informativo/);
    expect(computeVerdict(checks)).toBe('compatible');
  });

  it('WebSocket al broker: ok, lento, error, sin respuesta o sin medir', () => {
    const snapshot = healthySnapshot();
    const broker = (results: Record<string, unknown>) =>
      byId(
        buildChecks({
          snapshot,
          network: buildNetworkSection(snapshot),
          probe: { ...FULL_PROBE, results: { ...FULL_PROBE.results, ...results } },
          paired: true,
        }),
      ).get('net.broker');
    expect(broker({ brokerWs: 'ok', brokerWsMs: 200 })?.status).toBe('ok');
    expect(broker({ brokerWs: 'ok', brokerWsMs: 5000 })?.status).toBe('warn');
    const error = broker({ brokerWs: 'error', brokerWsDetail: 'close 1006' });
    expect(error?.status).toBe('fail');
    expect(error?.impact).toBe('setup');
    expect(error?.detail).toMatch(/close 1006/);
    expect(broker({ brokerWs: 'timeout' })?.status).toBe('fail');
    expect(broker({ brokerWs: 'skipped' })?.status).toBe('skip');
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

  it('el kernel se mide contra la versión de fábrica si el equipo fue actualizado', () => {
    // Salió con Android 9 (API 28): kernel 4.4 es válido aunque hoy corra 11.
    expect(
      versionInconsistencies({ androidVersion: '11', apiLevel: 30, firstApiLevel: 28, kernel: '4.4.177' }, { chromeMajor: 151 }),
    ).toEqual([]);
    // Sin first_api_level se sigue usando la declarada.
    expect(versionInconsistencies({ androidVersion: '11', apiLevel: 30, kernel: '4.4.177' }, { chromeMajor: 151 })).toEqual([
      'kernel 4.4 es demasiado viejo para Android 11',
    ]);
    // Una caja que falsea la versión no se salva: su first_api_level no es menor.
    expect(
      versionInconsistencies({ androidVersion: '13', apiLevel: 28, firstApiLevel: 28, kernel: '4.9.113' }, { chromeMajor: 69 }),
    ).toHaveLength(3);
  });

  it('parseKernel tolera formatos raros', () => {
    expect(parseKernel('4.9.113-g1234')).toEqual([4, 9]);
    expect(parseKernel('')).toBeUndefined();
    expect(parseKernel(undefined)).toBeUndefined();
  });
});

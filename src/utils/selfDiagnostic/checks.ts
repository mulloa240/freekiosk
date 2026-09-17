import type { CheckImpact, CheckStatus, DiagnosticCheck, NativeDiagnosticsSnapshot, NetworkSection, ProbeSection } from './types';

/*
 * Reglas de compatibilidad. Puras: reciben el snapshot nativo, la sección de
 * red y la sonda, y devuelven la lista de checks. Los umbrales están acá para
 * poder ajustarlos con datos reales de la flota (X96 mini, etc.).
 */

export const THRESHOLDS = {
  // Piso del bundle legacy del kiosk-client (plugin-legacy: chrome >= 61) y
  // piso del bundle moderno (sintaxis ES2020: optional chaining).
  chromeLegacyMin: 61,
  chromeModernMin: 80,
  ramOkMB: 2048,
  ramMinMB: 768,
  heapOkMB: 192,
  storageWarnMB: 500,
  storageMinMB: 200,
  screenMinPx: 720,
  apiOk: 26,
  apiMin: 24,
  clockWarnSec: 5 * 60,
  clockFailSec: 24 * 3600,
  slowEndpointMs: 3000,
} as const;

// ABIs que empaqueta el APK (reactNativeArchitectures en CI).
export const PACKAGED_ABIS = ['armeabi-v7a', 'arm64-v8a', 'x86_64'];

// Kernel mínimo con el que Android de cada versión puede correr de verdad
// (cajas con build.prop falseado declaran Android 13 sobre kernels 3.x/4.9).
const MIN_KERNEL_BY_ANDROID: Array<{ android: number; kernel: [number, number] }> = [
  { android: 13, kernel: [4, 14] },
  { android: 11, kernel: [4, 9] },
  { android: 10, kernel: [4, 4] },
  { android: 9, kernel: [3, 18] },
];

// SDK esperado para cada versión mayor declarada.
const SDK_BY_ANDROID: Record<number, number[]> = {
  7: [24, 25],
  8: [26, 27],
  9: [28],
  10: [29],
  11: [30],
  12: [31, 32],
  13: [33],
  14: [34],
  15: [35],
  16: [36],
};

function check(
  id: string,
  status: CheckStatus,
  impact: CheckImpact,
  value?: string | number | boolean,
  detail?: string,
): DiagnosticCheck {
  const c: DiagnosticCheck = { id, status, impact };
  if (value !== undefined) c.value = value;
  if (detail) c.detail = detail.slice(0, 300);
  return c;
}

export function parseKernel(kernel: string | undefined): [number, number] | undefined {
  if (!kernel) return undefined;
  const m = /^(\d+)\.(\d+)/.exec(kernel.trim());
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2])];
}

/**
 * Cruza la versión de Android declarada con lo que el sistema no puede
 * falsear (SDK_INT, kernel, WebView). Devuelve las inconsistencias.
 */
export function versionInconsistencies(
  device: NativeDiagnosticsSnapshot['device'],
  webview: NativeDiagnosticsSnapshot['webview'],
): string[] {
  const reasons: string[] = [];
  const declared = Number.parseInt(String(device.androidVersion ?? '').split('.')[0], 10);
  const sdk = device.apiLevel;
  if (Number.isFinite(declared) && typeof sdk === 'number') {
    const expected = SDK_BY_ANDROID[declared];
    if (expected && !expected.includes(sdk)) {
      reasons.push(`declara Android ${declared} pero el API level real es ${sdk}`);
    }
  }
  const kernel = parseKernel(device.kernel);
  if (Number.isFinite(declared) && kernel) {
    const rule = MIN_KERNEL_BY_ANDROID.find((r) => declared >= r.android);
    if (rule && (kernel[0] < rule.kernel[0] || (kernel[0] === rule.kernel[0] && kernel[1] < rule.kernel[1]))) {
      reasons.push(`kernel ${kernel[0]}.${kernel[1]} es demasiado viejo para Android ${declared}`);
    }
  }
  if (Number.isFinite(declared) && declared >= 10 && typeof webview.chromeMajor === 'number' && webview.chromeMajor < 70) {
    reasons.push(`WebView Chrome ${webview.chromeMajor} no corresponde a Android ${declared}`);
  }
  if (typeof device.firstApiLevel === 'number' && typeof sdk === 'number' && device.firstApiLevel > sdk) {
    reasons.push(`first_api_level ${device.firstApiLevel} mayor que el API level ${sdk}`);
  }
  return reasons;
}

export interface BuildChecksInput {
  snapshot: NativeDiagnosticsSnapshot;
  network: NetworkSection;
  probe: ProbeSection;
  paired: boolean;
  displayMode?: string;
}

export function buildChecks(input: BuildChecksInput): DiagnosticCheck[] {
  const { snapshot, network, probe, paired, displayMode } = input;
  const { device, memory, storage, webview, permissions, app } = snapshot;
  const checks: DiagnosticCheck[] = [];
  const results = probe.results ?? {};
  const T = THRESHOLDS;

  // --- Android ---
  const api = device.apiLevel;
  if (typeof api === 'number') {
    if (api >= T.apiOk) checks.push(check('android.api', 'ok', 'compat', api));
    else if (api >= T.apiMin) {
      checks.push(
        check('android.api', 'warn', 'compat', api, 'Android 7: WebView de sistema no actualizable e instalación de actualizaciones con confirmación'),
      );
    } else checks.push(check('android.api', 'fail', 'compat', api, 'Android anterior a 7.0 no es soportado'));
  } else checks.push(check('android.api', 'skip', 'compat'));

  const inconsistencies = versionInconsistencies(device, webview);
  checks.push(
    inconsistencies.length === 0
      ? check('device.versionConsistency', 'ok', 'compat', device.androidVersion)
      : check('device.versionConsistency', 'warn', 'compat', device.androidVersion, `Versión de Android declarada no coincide con el sistema real: ${inconsistencies.join('; ')}`),
  );

  // --- Hardware ---
  const abis = device.abis ?? [];
  if (abis.length === 0) checks.push(check('device.abi', 'skip', 'compat'));
  else if (abis.includes('arm64-v8a')) checks.push(check('device.abi', 'ok', 'compat', abis.join(',')));
  else if (abis.some((a) => PACKAGED_ABIS.includes(a))) checks.push(check('device.abi', 'warn', 'compat', abis.join(','), 'Solo 32 bits (armeabi-v7a)'));
  else checks.push(check('device.abi', 'fail', 'compat', abis.join(','), 'Ninguna ABI del APK es compatible con este equipo'));

  if (device.touchscreen === false) {
    checks.push(check('device.touch', 'warn', 'compat', false, 'Sin pantalla táctil: el manejo es por control remoto / D-pad'));
  } else checks.push(check('device.touch', 'ok', 'compat', true));

  const minSide = device.screen?.w && device.screen?.h ? Math.min(device.screen.w, device.screen.h) : undefined;
  if (typeof minSide === 'number') {
    checks.push(
      minSide >= T.screenMinPx
        ? check('device.screen', 'ok', 'compat', `${device.screen?.w}x${device.screen?.h}`)
        : check('device.screen', 'warn', 'compat', `${device.screen?.w}x${device.screen?.h}`, 'Resolución baja para el contenido del kiosko'),
    );
  }

  // --- Memoria ---
  if (typeof memory.totalMB === 'number') {
    if (memory.totalMB >= T.ramOkMB) checks.push(check('memory.total', 'ok', 'compat', memory.totalMB));
    else if (memory.totalMB >= T.ramMinMB) checks.push(check('memory.total', 'warn', 'compat', memory.totalMB, 'Menos de 2 GB de RAM: contenido pesado (PDF, video) puede tumbar el WebView'));
    else checks.push(check('memory.total', 'fail', 'compat', memory.totalMB, 'RAM insuficiente'));
  }
  if (typeof memory.largeMemoryClassMB === 'number') {
    checks.push(
      memory.largeMemoryClassMB >= T.heapOkMB
        ? check('memory.class', 'ok', 'compat', memory.largeMemoryClassMB)
        : check('memory.class', 'warn', 'compat', memory.largeMemoryClassMB, 'Heap por app reducido: limita al WebView en Android 7'),
    );
  }
  if (memory.lowMemory) checks.push(check('memory.lowNow', 'warn', 'setup', true, 'El sistema está en memoria baja ahora mismo'));
  else if (typeof memory.lowMemory === 'boolean') checks.push(check('memory.lowNow', 'ok', 'setup', false));

  if (typeof storage.availableMB === 'number') {
    if (storage.availableMB >= T.storageWarnMB) checks.push(check('storage.free', 'ok', 'compat', storage.availableMB));
    else if (storage.availableMB >= T.storageMinMB) checks.push(check('storage.free', 'warn', 'compat', storage.availableMB, 'Poco espacio libre'));
    else checks.push(check('storage.free', 'fail', 'compat', storage.availableMB, 'No hay espacio para la caché de contenido ni para actualizar el APK'));
  }

  // --- WebView ---
  let chrome = webview.chromeMajor;
  if (typeof chrome !== 'number') {
    // Sin UA por defecto: se infiere del probe (noModule ⇒ >= 61, optional chaining ⇒ >= 80).
    if (results.optionalChaining === true) chrome = T.chromeModernMin;
    else if (results.esModules === true) chrome = T.chromeLegacyMin;
  }
  const wvLabel = webview.packageName ? `${webview.packageName} ${webview.versionName ?? ''}`.trim() : undefined;
  if (typeof chrome === 'number') {
    if (chrome >= T.chromeModernMin) checks.push(check('webview.version', 'ok', 'compat', chrome, wvLabel));
    else if (chrome >= T.chromeLegacyMin) checks.push(check('webview.version', 'warn', 'compat', chrome, `WebView viejo: el kiosko usa el bundle legacy${wvLabel ? ` (${wvLabel})` : ''}`));
    else checks.push(check('webview.version', 'fail', 'compat', chrome, `WebView demasiado viejo (Chrome < ${T.chromeLegacyMin}): el kiosko no arranca${wvLabel ? ` (${wvLabel})` : ''}`));
  } else checks.push(check('webview.version', 'warn', 'compat', wvLabel ?? 'desconocido', 'No se pudo identificar la versión del WebView'));

  const aospProvider = webview.packageName === 'com.android.webview';
  if (webview.gmsPresent === false && aospProvider) {
    checks.push(check('webview.updatable', 'warn', 'compat', false, 'WebView AOSP firmado por el ROM y sin Google Play: no se puede actualizar'));
  } else if (typeof webview.gmsPresent === 'boolean') checks.push(check('webview.updatable', 'ok', 'compat', true));

  // --- Sonda JS ---
  if (!probe.ran) {
    checks.push(check('probe.run', 'skip', 'compat', false, 'La sonda no pudo ejecutarse en el WebView'));
  } else {
    checks.push(check('probe.run', 'ok', 'compat', true));
    const must: Array<[string, string]> = [
      ['serviceWorker', 'probe.serviceWorker'],
      ['fetch', 'probe.fetch'],
      ['webSocket', 'probe.webSocket'],
      ['worker', 'probe.workers'],
      ['localStorage', 'probe.localStorage'],
    ];
    for (const [key, id] of must) {
      checks.push(results[key] === true ? check(id, 'ok', 'compat', true) : check(id, 'fail', 'compat', false, `Falta ${key}`));
    }
    const nice: Array<[string, string, string]> = [
      ['optionalChaining', 'probe.modernSyntax', 'Sin sintaxis ES2020: se usa el bundle legacy'],
      ['intersectionObserver', 'probe.intersectionObserver', 'Sin IntersectionObserver: el visor de PDF no virtualiza páginas'],
      ['cssGrid', 'probe.cssGrid', 'Sin CSS grid: layouts de página degradados'],
      ['cssAspectRatio', 'probe.cssAspectRatio', 'Sin aspect-ratio (informativo)'],
      ['webgl', 'probe.webgl', 'Sin WebGL (informativo)'],
      ['videoH264', 'probe.videoH264', 'El WebView no reporta soporte H.264'],
    ];
    for (const [key, id, why] of nice) {
      checks.push(results[key] === true ? check(id, 'ok', 'compat', true) : check(id, 'warn', 'compat', false, why));
    }
  }

  // --- Red (setup) ---
  const netType = network.type;
  if (netType === 'wifi' || netType === 'ethernet') checks.push(check('net.type', 'ok', 'setup', netType));
  else if (netType === 'none') checks.push(check('net.type', 'fail', 'setup', netType, 'Sin conexión de red'));
  else checks.push(check('net.type', 'warn', 'setup', netType ?? 'unknown'));

  const endpoint = (id: string, probeResult: NetworkSection['kioskClient']) => {
    if (!probeResult) return check(id, 'skip', 'setup');
    if (probeResult.ok) {
      return typeof probeResult.ms === 'number' && probeResult.ms > T.slowEndpointMs
        ? check(id, 'warn', 'setup', probeResult.ms, 'Respuesta lenta')
        : check(id, 'ok', 'setup', probeResult.ms ?? true);
    }
    const why = probeResult.errorClass === 'tls'
      ? 'Fallo TLS: certificado no confiable o reloj del equipo incorrecto'
      : probeResult.errorClass === 'dns'
        ? 'No resuelve el dominio (DNS)'
        : probeResult.errorClass === 'timeout'
          ? 'Sin respuesta (timeout)'
          : `Error HTTP ${probeResult.status ?? ''}`.trim();
    return check(id, 'fail', 'setup', probeResult.errorClass ?? probeResult.status ?? false, `${why}${probeResult.error ? ` · ${probeResult.error}` : ''}`);
  };
  checks.push(endpoint('net.kioskClient', network.kioskClient));
  checks.push(endpoint('net.adminApi', network.adminApi));

  if (network.clockBeforeBuild) {
    checks.push(check('net.clock', 'fail', 'setup', 'before-build', 'El reloj del equipo es anterior a la fecha del build: TLS fallará hasta que sincronice la hora'));
  } else if (typeof network.clockSkewSec === 'number') {
    const abs = Math.abs(network.clockSkewSec);
    if (abs > T.clockFailSec) checks.push(check('net.clock', 'fail', 'setup', network.clockSkewSec, 'Reloj desfasado más de un día'));
    else if (abs > T.clockWarnSec) checks.push(check('net.clock', 'warn', 'setup', network.clockSkewSec, 'Reloj desfasado más de 5 minutos'));
    else checks.push(check('net.clock', 'ok', 'setup', network.clockSkewSec));
  } else checks.push(check('net.clock', 'skip', 'setup'));

  // --- Permisos (setup) ---
  const perm = (id: string, value: boolean | undefined, why: string) => {
    if (typeof value !== 'boolean') return check(id, 'skip', 'setup');
    return value ? check(id, 'ok', 'setup', true) : check(id, 'warn', 'setup', false, why);
  };
  checks.push(perm('perm.deviceOwner', permissions.deviceOwner, 'Sin Device Owner: el bloqueo real del equipo no está disponible'));
  checks.push(perm('perm.lockTask', permissions.lockTaskPermitted, 'Lock task no permitido para la app'));
  checks.push(perm('perm.accessibility', permissions.accessibility, 'Servicio de accesibilidad desactivado'));
  checks.push(perm('perm.overlay', permissions.overlay, 'Sin permiso de superposición'));
  checks.push(perm('perm.batteryOpt', permissions.batteryOptimizationIgnored, 'Optimización de batería activa: Android puede dormir la app'));
  if (app.selfUpdate) {
    checks.push(perm('perm.installPackages', permissions.installPackages, 'Sin permiso para instalar actualizaciones'));
  }

  // --- App (setup) ---
  checks.push(paired ? check('app.paired', 'ok', 'setup', true) : check('app.paired', 'warn', 'setup', false, 'Equipo sin emparejar (sin token de dispositivo)'));
  if (displayMode) {
    checks.push(displayMode === 'webview' ? check('app.displayMode', 'ok', 'setup', displayMode) : check('app.displayMode', 'warn', 'setup', displayMode, 'El kiosko Somelier requiere el modo WebView'));
  }

  return checks;
}

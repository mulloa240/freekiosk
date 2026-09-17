import type { NativeDiagnosticsSnapshot } from '../types';

/** Snapshot de un tablet moderno "sano". */
export function healthySnapshot(over: Partial<NativeDiagnosticsSnapshot> = {}): NativeDiagnosticsSnapshot {
  return {
    device: {
      manufacturer: 'samsung',
      model: 'SM-X200',
      androidVersion: '13',
      apiLevel: 33,
      kernel: '5.10.101',
      abis: ['arm64-v8a', 'armeabi-v7a'],
      isTv: false,
      touchscreen: true,
      hasDpad: false,
      screen: { w: 1200, h: 1920, dpi: 224, density: 1.4 },
    },
    memory: { totalMB: 3800, availableMB: 1900, lowMemory: false, memoryClassMB: 256, largeMemoryClassMB: 512 },
    storage: { totalMB: 32000, availableMB: 12000 },
    webview: { packageName: 'com.google.android.webview', versionName: '131.0.6778.39', chromeMajor: 131, source: 'current', gmsPresent: true },
    permissions: {
      deviceOwner: true,
      lockTaskPermitted: true,
      accessibility: true,
      overlay: true,
      usageStats: true,
      installPackages: true,
      batteryOptimizationIgnored: true,
      writeSecureSettings: false,
    },
    clock: { nowMs: 1_800_000_000_000, buildTimeMs: 1_790_000_000_000, autoTime: true, timezone: 'America/Santiago' },
    app: { versionName: '1.2.26', versionCode: 49, selfUpdate: true },
    network: {
      type: 'wifi',
      kioskClient: { ok: true, status: 200, ms: 120, serverDateMs: 1_800_000_000_000 - 2000 },
      adminApi: { ok: true, status: 200, ms: 80, serverDateMs: 1_800_000_000_000 - 1000 },
    },
    ...over,
  };
}

/** Snapshot de una caja X96 mini "Android 13" falseado sobre 7.1 / WebView 58. */
export function fakeAndroid13BoxSnapshot(): NativeDiagnosticsSnapshot {
  const base = healthySnapshot();
  return {
    ...base,
    device: {
      ...base.device,
      manufacturer: 'Amlogic',
      model: 'X96mini',
      androidVersion: '13',
      apiLevel: 25,
      kernel: '3.14.29',
      abis: ['armeabi-v7a', 'armeabi'],
      isTv: true,
      touchscreen: false,
      hasDpad: true,
      screen: { w: 1920, h: 1080, dpi: 320, density: 2 },
    },
    memory: { totalMB: 1900, availableMB: 600, lowMemory: false, memoryClassMB: 128, largeMemoryClassMB: 256 },
    storage: { totalMB: 8000, availableMB: 3000 },
    webview: { packageName: 'com.android.webview', versionName: '58.0.3029.125', chromeMajor: 58, source: 'loaded', gmsPresent: false },
    permissions: { ...base.permissions, deviceOwner: false, accessibility: false, installPackages: false },
    clock: { nowMs: 1_262_304_000_000, buildTimeMs: 1_790_000_000_000, autoTime: false, timezone: 'UTC' },
    network: {
      type: 'ethernet',
      kioskClient: { ok: false, errorClass: 'tls', error: 'SSLHandshakeException: Trust anchor not found', ms: 300 },
      adminApi: { ok: false, errorClass: 'tls', error: 'SSLHandshakeException: Trust anchor not found', ms: 250 },
      plainHttp: { ok: true, status: 301, ms: 90, serverDateMs: 1_800_000_000_000 },
    },
  };
}

export const FULL_PROBE = {
  ran: true,
  ms: 12,
  results: {
    esModules: true,
    optionalChaining: true,
    nullishCoalescing: true,
    serviceWorker: true,
    fetch: true,
    webSocket: true,
    worker: true,
    localStorage: true,
    intersectionObserver: true,
    cssGrid: true,
    cssAspectRatio: true,
    webgl: true,
    videoH264: true,
  },
};

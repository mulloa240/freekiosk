import type { ProbeSection } from './types';

export const PROBE_MESSAGE_TYPE = 'SOMELIER_DIAG_PROBE_RESULT';

/**
 * Sonda de capacidades que corre DENTRO del WebView. Es ES5 a propósito: tiene
 * que ejecutar en un WebView tan viejo que ni parsea el bundle del
 * kiosk-client (ese es el caso que queremos medir). Cada capacidad se prueba
 * por separado en try/catch para que un fallo no tape al resto. El resultado
 * vuelve por postMessage con el `requestId` para correlacionarlo.
 */
export function buildProbeScript(requestId: string): string {
  const id = JSON.stringify(requestId);
  return `
    (function(){
      var t0 = Date.now();
      var r = {};
      function test(name, fn){ try { r[name] = !!fn(); } catch (e) { r[name] = false; } }
      function syntax(name, src){ try { new Function(src); r[name] = true; } catch (e) { r[name] = false; } }
      test('esModules', function(){ return 'noModule' in document.createElement('script'); });
      syntax('optionalChaining', 'var a = {}; return a?.b;');
      syntax('nullishCoalescing', 'return null ?? 1;');
      syntax('asyncAwait', 'async function f(){ await 1; }');
      syntax('objectSpread', 'var a = {...{}};');
      syntax('classFields', 'class A { x = 1; }');
      test('serviceWorker', function(){ return 'serviceWorker' in navigator; });
      test('serviceWorkerControlled', function(){ return !!(navigator.serviceWorker && navigator.serviceWorker.controller); });
      test('fetch', function(){ return typeof fetch === 'function'; });
      test('webSocket', function(){ return typeof WebSocket === 'function'; });
      test('worker', function(){ return typeof Worker === 'function'; });
      test('intersectionObserver', function(){ return typeof IntersectionObserver === 'function'; });
      test('resizeObserver', function(){ return typeof ResizeObserver === 'function'; });
      test('abortController', function(){ return typeof AbortController === 'function'; });
      test('textEncoder', function(){ return typeof TextEncoder === 'function'; });
      test('promiseFinally', function(){ return typeof Promise === 'function' && typeof Promise.prototype.finally === 'function'; });
      test('cssGrid', function(){ return window.CSS && CSS.supports && CSS.supports('display', 'grid'); });
      test('cssAspectRatio', function(){ return window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1 / 1'); });
      test('cssGap', function(){ return window.CSS && CSS.supports && CSS.supports('gap', '1px'); });
      test('localStorage', function(){ localStorage.setItem('__diag', '1'); var v = localStorage.getItem('__diag'); localStorage.removeItem('__diag'); return v === '1'; });
      test('webgl', function(){ var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); });
      test('videoH264', function(){ var v = document.createElement('video'); return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.42E01E"')); });
      try { r.hardwareConcurrency = navigator.hardwareConcurrency || 0; } catch (e) {}
      try { r.deviceMemory = navigator.deviceMemory || 0; } catch (e) {}
      try { r.devicePixelRatio = window.devicePixelRatio || 1; } catch (e) {}
      try { r.viewport = window.innerWidth + 'x' + window.innerHeight; } catch (e) {}
      var payload = { type: '${PROBE_MESSAGE_TYPE}', requestId: ${id}, results: r, ms: Date.now() - t0 };
      try { payload.origin = location.origin; } catch (e) {}
      try { payload.uaInPage = navigator.userAgent; } catch (e) {}
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
    })();
    true;
  `;
}

export interface ProbeMessage {
  type: typeof PROBE_MESSAGE_TYPE;
  requestId: string;
  results?: Record<string, unknown>;
  ms?: number;
  origin?: string;
  uaInPage?: string;
}

export function isProbeMessage(data: unknown): data is ProbeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === PROBE_MESSAGE_TYPE &&
    typeof (data as { requestId?: unknown }).requestId === 'string'
  );
}

export function parseProbeResult(message: ProbeMessage): ProbeSection {
  const results: Record<string, unknown> = {};
  const raw = message.results ?? {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      results[key] = typeof value === 'string' ? value.slice(0, 100) : value;
    }
  }
  return {
    ran: true,
    ms: typeof message.ms === 'number' ? message.ms : undefined,
    origin: typeof message.origin === 'string' ? message.origin.slice(0, 300) : undefined,
    uaInPage: typeof message.uaInPage === 'string' ? message.uaInPage.slice(0, 500) : undefined,
    results,
  };
}

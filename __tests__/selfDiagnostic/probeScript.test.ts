import { buildProbeScript, isProbeMessage, parseProbeResult } from '../../src/utils/selfDiagnostic/probeScript';
import {
  registerFallbackProbeRunner,
  registerProbeRunner,
  resolveProbeResult,
  runProbe,
  unregisterFallbackProbeRunner,
  unregisterProbeRunner,
} from '../../src/utils/selfDiagnostic/probeBus';

/**
 * Corre el script de la sonda contra un WebView de mentira: `window`,
 * `document`, `location` y `WebSocket` son parámetros que tapan a los
 * globales de Node. Devuelve lo que la sonda mandó por postMessage y los
 * WebSockets que abrió.
 */
function runInFakeWebView(options: { brokerUrl?: string; protocol?: string; secure?: boolean }) {
  const posted: Array<Record<string, any>> = [];
  const sockets: FakeWebSocket[] = [];
  class FakeWebSocket {
    url: string;
    closed = false;
    onmessage?: () => void;
    onerror?: () => void;
    onclose?: (ev: { code: number }) => void;
    constructor(url: string) {
      this.url = url;
      sockets.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const win = {
    __SOMELIER__: options.brokerUrl ? { EVENT_BROKER_URL: options.brokerUrl } : undefined,
    isSecureContext: options.secure ?? true,
    innerWidth: 1920,
    innerHeight: 1080,
    ReactNativeWebView: { postMessage: (m: string) => posted.push(JSON.parse(m)) },
  };
  const doc = {
    createElement: () => ({}),
    head: { appendChild: () => {} },
  };
  const loc = { origin: `${options.protocol ?? 'https:'}//kiosko.example`, protocol: options.protocol ?? 'https:' };
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'document', 'location', 'WebSocket', 'navigator', buildProbeScript('req-1'));
  fn(win, doc, loc, FakeWebSocket, { userAgent: 'test' });
  return { posted, sockets };
}

describe('probeScript', () => {
  it('el script es ES5 parseable e incluye el requestId', () => {
    const script = buildProbeScript('abc');
    expect(script).toContain('"abc"');
    // Debe compilar como función ES5 (sin flechas, sin let/const, sin template strings).
    // eslint-disable-next-line no-new-func
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toMatch(new RegExp('=>|\\blet\\b|\\bconst\\b'));
  });

  it('parseProbeResult conserva solo valores primitivos y recorta strings', () => {
    const section = parseProbeResult({
      type: 'SOMELIER_DIAG_PROBE_RESULT',
      requestId: 'r',
      ms: 5,
      origin: 'https://kiosk',
      uaInPage: 'x'.repeat(600),
      results: { a: true, b: 3, c: 'y'.repeat(200), d: { nested: true } },
    });
    expect(section.ran).toBe(true);
    expect(section.results).toEqual({ a: true, b: 3, c: 'y'.repeat(100) });
    expect(section.uaInPage).toHaveLength(500);
    expect(isProbeMessage({ type: 'OTRO' })).toBe(false);
  });

  it('abre un WebSocket al broker de /config.js y contesta cuando llega el primer paquete', () => {
    const { posted, sockets } = runInFakeWebView({ brokerUrl: 'https://eventos.example/' });
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe('wss://eventos.example/socket.io/?EIO=4&transport=websocket');
    expect(posted).toHaveLength(0); // espera al broker antes de contestar

    sockets[0].onmessage?.();
    expect(posted).toHaveLength(1);
    expect(posted[0].requestId).toBe('req-1');
    expect(posted[0].results.brokerWs).toBe('ok');
    expect(posted[0].results.secureContext).toBe(true);
    expect(sockets[0].closed).toBe(true);
  });

  it('un WebSocket que no abre se informa como error, una sola vez', () => {
    const { posted, sockets } = runInFakeWebView({ brokerUrl: 'https://eventos.example' });
    sockets[0].onerror?.();
    sockets[0].onclose?.({ code: 1006 });
    expect(posted).toHaveLength(1);
    expect(posted[0].results.brokerWs).toBe('error');
  });

  it('sin broker configurado ni https contesta enseguida con brokerWs "skipped"', () => {
    const { posted, sockets } = runInFakeWebView({ protocol: 'about:', secure: false });
    expect(sockets).toHaveLength(0);
    expect(posted).toHaveLength(1);
    expect(posted[0].results.brokerWs).toBe('skipped');
    expect(posted[0].results.secureContext).toBe(false);
  });
});

describe('probeBus', () => {
  afterEach(() => jest.useRealTimers());

  it('runProbe resuelve con el resultado que llega por resolveProbeResult', async () => {
    let captured: { script: string; id: string } | undefined;
    const runner = (script: string, id: string) => {
      captured = { script, id };
      return true;
    };
    registerProbeRunner(runner);
    const promise = runProbe({ timeoutMs: 1000 });
    expect(captured).toBeDefined();
    expect(resolveProbeResult({ type: 'SOMELIER_DIAG_PROBE_RESULT', requestId: captured!.id, results: { fetch: true } })).toBe(true);
    const section = await promise;
    expect(section.ran).toBe(true);
    expect(section.results?.fetch).toBe(true);
    unregisterProbeRunner(runner);
  });

  it('si el WebView del kiosko no puede correr la sonda, usa el de respaldo', async () => {
    const kiosk = jest.fn(() => false);
    let captured: string | undefined;
    const fallback = (_script: string, id: string) => {
      captured = id;
      return true;
    };
    registerProbeRunner(kiosk);
    registerFallbackProbeRunner(fallback);
    const promise = runProbe({ timeoutMs: 1000 });
    expect(kiosk).toHaveBeenCalled();
    expect(captured).toBeDefined();
    resolveProbeResult({ type: 'SOMELIER_DIAG_PROBE_RESULT', requestId: captured!, results: { fetch: true } });
    expect((await promise).ran).toBe(true);
    unregisterProbeRunner(kiosk);
    unregisterFallbackProbeRunner(fallback);
  });

  it('sin runner o con timeout devuelve ran:false', async () => {
    expect(await runProbe()).toEqual({ ran: false });
    jest.useFakeTimers();
    const promise = runProbe({ runner: () => true, timeoutMs: 50 });
    jest.advanceTimersByTime(60);
    expect(await promise).toEqual({ ran: false });
  });
});

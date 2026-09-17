import { buildProbeScript, isProbeMessage, parseProbeResult } from '../../src/utils/selfDiagnostic/probeScript';
import { registerProbeRunner, resolveProbeResult, runProbe, unregisterProbeRunner } from '../../src/utils/selfDiagnostic/probeBus';

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

  it('sin runner o con timeout devuelve ran:false', async () => {
    expect(await runProbe()).toEqual({ ran: false });
    jest.useFakeTimers();
    const promise = runProbe({ runner: () => true, timeoutMs: 50 });
    jest.advanceTimersByTime(60);
    expect(await promise).toEqual({ ran: false });
  });
});

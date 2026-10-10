/**
 * Respaldo de la sonda del auto-diagnóstico (Somelier), montado en la raíz de
 * la app. Cuando el WebView del kiosko no está montado o no puede correr la
 * sonda (pantalla de error, visor de PDF), el probeBus le pasa el script a
 * este host, que monta un WebView oculto con el origen del kiosk-client. Así
 * los diagnósticos automáticos y remotos miden el WebView en un contexto
 * seguro en vez de quedar en "skip" o dar un falso "Falta serviceWorker".
 */
import React, { useEffect, useState } from 'react';
import DiagnosticProbeWebView from './DiagnosticProbeWebView';
import {
  DEFAULT_PROBE_TIMEOUT_MS,
  registerFallbackProbeRunner,
  unregisterFallbackProbeRunner,
  type ProbeRunner,
} from '../utils/selfDiagnostic';

// El WebView oculto se desmonta solo, un poco después del plazo de la sonda.
const UNMOUNT_AFTER_MS = DEFAULT_PROBE_TIMEOUT_MS + 2000;

const DiagnosticProbeHost: React.FC = () => {
  const [script, setScript] = useState<string | undefined>(undefined);

  useEffect(() => {
    const runner: ProbeRunner = (probeScript) => {
      setScript(probeScript);
      return true;
    };
    registerFallbackProbeRunner(runner);
    return () => unregisterFallbackProbeRunner(runner);
  }, []);

  useEffect(() => {
    if (!script) return;
    const timer = setTimeout(() => setScript(undefined), UNMOUNT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [script]);

  return script ? <DiagnosticProbeWebView key={script} script={script} /> : null;
};

export default DiagnosticProbeHost;

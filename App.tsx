import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { runAutoUpdate } from './src/utils/autoUpdate';
import { flushPendingDiagnostics, maybeAutoRunDiagnostic } from './src/utils/selfDiagnostic';

// Retardo del auto-diagnóstico al arrancar: que el kiosko cargue primero.
const AUTO_DIAGNOSTIC_DELAY_MS = 20_000;

const App: React.FC = () => {
  // Auto-actualización al arrancar: si hay una versión nueva en nuestros
  // GitHub Releases, se descarga e instala (best-effort, ver autoUpdate.ts).
  useEffect(() => {
    void runAutoUpdate();
  }, []);

  // Auto-diagnóstico de compatibilidad (Somelier): corre solo tras emparejar,
  // la primera vez y cuando cambia la versión; y reintenta envíos en cola al
  // volver a primer plano.
  useEffect(() => {
    const timer = setTimeout(() => void maybeAutoRunDiagnostic(), AUTO_DIAGNOSTIC_DELAY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushPendingDiagnostics();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar hidden={true} />
      <AppNavigator />
    </>
  );
};

export default App;

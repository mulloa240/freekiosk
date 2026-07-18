import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { runAutoUpdate } from './src/utils/autoUpdate';

const App: React.FC = () => {
  // Auto-actualización al arrancar: si hay una versión nueva en nuestros
  // GitHub Releases, se descarga e instala (best-effort, ver autoUpdate.ts).
  useEffect(() => {
    void runAutoUpdate();
  }, []);

  return (
    <>
      <StatusBar hidden={true} />
      <AppNavigator />
    </>
  );
};

export default App;

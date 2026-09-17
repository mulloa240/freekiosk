/**
 * WebView oculto (1×1) que ejecuta la sonda de capacidades del auto-diagnóstico
 * cuando no se quiere depender del WebView del kiosko (Ajustes, Emparejamiento
 * sin token). Se carga con el origen del kiosk-client (`baseUrl`) para que
 * localStorage / Service Worker se evalúen en el mismo origen, y SIN el
 * User-Agent sobrescrito, así `uaInPage` es el UA real del WebView.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SOMELIER_BASE_URL } from '../config/somelier';
import { resolveProbeResult } from '../utils/selfDiagnostic';

interface Props {
  script: string;
}

const BLANK_HTML = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

const DiagnosticProbeWebView: React.FC<Props> = ({ script }) => {
  return (
    <View style={styles.hidden} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <WebView
        source={{ html: BLANK_HTML, baseUrl: SOMELIER_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={script}
        onMessage={(event) => {
          try {
            resolveProbeResult(JSON.parse(event.nativeEvent.data));
          } catch {
            // no era JSON
          }
        }}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  webview: { width: 1, height: 1 },
});

export default DiagnosticProbeWebView;

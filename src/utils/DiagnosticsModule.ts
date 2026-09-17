import { NativeModules, Platform } from 'react-native';
import type { NativeDiagnosticsSnapshot } from './selfDiagnostic/types';

interface DiagnosticsModuleInterface {
  /**
   * Foto nativa del equipo para el auto-diagnóstico (Somelier). Las URLs se
   * sondean desde Kotlin (clasifica TLS/DNS/timeout y lee la cabecera Date).
   */
  collect(kioskUrl: string, adminApiHealthUrl: string, plainHttpUrl: string): Promise<NativeDiagnosticsSnapshot>;
}

const DiagnosticsModule: DiagnosticsModuleInterface =
  Platform.OS === 'android' && NativeModules.DiagnosticsModule
    ? NativeModules.DiagnosticsModule
    : {
        collect: () => Promise.reject(new Error('DiagnosticsModule no disponible en esta plataforma')),
      };

export default DiagnosticsModule;

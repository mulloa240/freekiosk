import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiagnosticReport } from './types';

export const DIAG_KEYS = {
  LAST_REPORT: '@somelier_diag_last_report',
  LAST_SENT: '@somelier_diag_last_sent',
  PENDING: '@somelier_diag_pending',
  DUE: '@somelier_diag_due',
} as const;

export const MAX_PENDING = 3;

export interface LastSentInfo {
  reportId: string;
  sentAt: string;
  appVersion?: string;
  verdict: DiagnosticReport['verdict'];
}

async function readJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort
  }
}

export const diagnosticStore = {
  saveLastReport: (report: DiagnosticReport) => writeJson(DIAG_KEYS.LAST_REPORT, report),
  loadLastReport: () => readJson<DiagnosticReport>(DIAG_KEYS.LAST_REPORT),

  saveLastSent: (info: LastSentInfo) => writeJson(DIAG_KEYS.LAST_SENT, info),
  loadLastSent: () => readJson<LastSentInfo>(DIAG_KEYS.LAST_SENT),

  /** Cola de reportes por enviar (se conservan los más nuevos). */
  async enqueuePending(report: DiagnosticReport): Promise<void> {
    const pending = (await readJson<DiagnosticReport[]>(DIAG_KEYS.PENDING)) ?? [];
    const next = [...pending.filter((r) => r.reportId !== report.reportId), report].slice(-MAX_PENDING);
    await writeJson(DIAG_KEYS.PENDING, next);
  },
  loadPending: async (): Promise<DiagnosticReport[]> => (await readJson<DiagnosticReport[]>(DIAG_KEYS.PENDING)) ?? [],
  savePending: (reports: DiagnosticReport[]) => writeJson(DIAG_KEYS.PENDING, reports),

  /** Marca que hay que correr un diagnóstico automático (p. ej. tras emparejar). */
  async markDue(): Promise<void> {
    try {
      await AsyncStorage.setItem(DIAG_KEYS.DUE, '1');
    } catch {}
  },
  async isDue(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(DIAG_KEYS.DUE)) === '1';
    } catch {
      return false;
    }
  },
  async clearDue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DIAG_KEYS.DUE);
    } catch {}
  },
};

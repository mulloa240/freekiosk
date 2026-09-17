import AsyncStorage from '@react-native-async-storage/async-storage';
import { DIAG_KEYS, MAX_PENDING, diagnosticStore } from '../../src/utils/selfDiagnostic/store';
import type { DiagnosticReport } from '../../src/utils/selfDiagnostic/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const report = (id: string): DiagnosticReport =>
  ({ schemaVersion: 1, reportId: id, generatedAt: new Date().toISOString(), trigger: 'manual', verdict: 'compatible' }) as DiagnosticReport;

describe('diagnosticStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda y recupera el último reporte', async () => {
    expect(await diagnosticStore.loadLastReport()).toBeUndefined();
    await diagnosticStore.saveLastReport(report('r1'));
    expect((await diagnosticStore.loadLastReport())?.reportId).toBe('r1');
  });

  it('la cola conserva solo los más nuevos y no duplica ids', async () => {
    for (let i = 0; i < MAX_PENDING + 2; i += 1) await diagnosticStore.enqueuePending(report(`r${i}`));
    await diagnosticStore.enqueuePending(report(`r${MAX_PENDING + 1}`));
    const pending = await diagnosticStore.loadPending();
    expect(pending).toHaveLength(MAX_PENDING);
    expect(pending[pending.length - 1].reportId).toBe(`r${MAX_PENDING + 1}`);
    expect(pending[0].reportId).toBe('r2');
  });

  it('el flag "due" se marca y se limpia', async () => {
    expect(await diagnosticStore.isDue()).toBe(false);
    await diagnosticStore.markDue();
    expect(await AsyncStorage.getItem(DIAG_KEYS.DUE)).toBe('1');
    expect(await diagnosticStore.isDue()).toBe(true);
    await diagnosticStore.clearDue();
    expect(await diagnosticStore.isDue()).toBe(false);
  });
});

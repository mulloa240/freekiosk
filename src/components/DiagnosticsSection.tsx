/**
 * Sección de auto-diagnóstico de compatibilidad (plataforma Somelier).
 *
 * Autocontenida (patrón ApiSettingsSection): se monta en Ajustes → Avanzado y
 * en la pantalla de diagnóstico accesible desde el emparejamiento. Ejecuta el
 * diagnóstico, muestra el veredicto y los checks agrupados, lo envía al portal
 * (o lo deja en cola si no hay token/red) y permite copiar el JSON.
 *
 * Todo es operable sin pantalla táctil (botones enfocables con D-pad).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Clipboard, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import SettingsSection from './settings/SettingsSection';
import SettingsButton from './settings/SettingsButton';
import DiagnosticProbeWebView from './DiagnosticProbeWebView';
import { Colors, Spacing } from '../theme';
import {
  diagnosticStore,
  flushPendingDiagnostics,
  postDiagnosticReport,
  runSelfDiagnostic,
  type DiagnosticCheck,
  type DiagnosticReport,
  type DiagnosticStep,
  type DiagnosticVerdict,
  type ProbeRunner,
} from '../utils/selfDiagnostic';
import type { SendOutcome } from '../utils/selfDiagnostic/sender';

type SendState = 'idle' | 'sending' | SendOutcome;

const VERDICT_COLOR: Record<DiagnosticVerdict, string> = {
  compatible: Colors.success,
  compatible_with_limitations: Colors.warning,
  not_compatible: Colors.error,
};

const STATUS_GLYPH: Record<DiagnosticCheck['status'], { glyph: string; color: string }> = {
  ok: { glyph: '✓', color: Colors.success },
  warn: { glyph: '!', color: Colors.warning },
  fail: { glyph: '✕', color: Colors.error },
  skip: { glyph: '–', color: Colors.textSecondary },
};

const GROUPS: Array<{ key: string; prefixes: string[] }> = [
  { key: 'gDiagDevice', prefixes: ['android.', 'device.'] },
  { key: 'gDiagMemory', prefixes: ['memory.', 'storage.'] },
  { key: 'gDiagWebview', prefixes: ['webview.', 'probe.'] },
  { key: 'gDiagNetwork', prefixes: ['net.'] },
  { key: 'gDiagSetup', prefixes: ['perm.', 'app.'] },
];

function formatValue(value: DiagnosticCheck['value']): string {
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  return String(value);
}

export const DiagnosticsSection: React.FC = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<DiagnosticReport | undefined>(undefined);
  const [lastSentId, setLastSentId] = useState<string | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<DiagnosticStep | undefined>(undefined);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [probeScript, setProbeScript] = useState<string | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void diagnosticStore.loadLastReport().then((r) => r && setReport(r));
    void diagnosticStore.loadLastSent().then((s) => s && setLastSentId(s.reportId));
  }, []);

  // Runner de la sonda: monta el WebView oculto con el script; el resultado
  // vuelve por resolveProbeResult (probeBus) y el orquestador continúa.
  const hiddenRunner = useCallback<ProbeRunner>((script) => {
    setProbeScript(script);
    return true;
  }, []);

  const run = async () => {
    setRunning(true);
    setSendState('idle');
    setShowAll(false);
    try {
      const result = await runSelfDiagnostic({ trigger: 'manual', probeRunner: hiddenRunner, onProgress: setStep });
      setProbeScript(undefined);
      setReport(result);
      setSendState('sending');
      const outcome = await postDiagnosticReport(result);
      setSendState(outcome);
      if (outcome === 'sent') setLastSentId(result.reportId);
    } catch (err) {
      Alert.alert(t('common.error'), String((err as Error)?.message ?? err));
    } finally {
      setProbeScript(undefined);
      setRunning(false);
      setStep(undefined);
    }
  };

  const resend = async () => {
    if (!report) return;
    setSendState('sending');
    const outcome = await postDiagnosticReport(report);
    await flushPendingDiagnostics(true);
    setSendState(outcome);
    if (outcome === 'sent') setLastSentId(report.reportId);
  };

  const copyJson = () => {
    if (!report) return;
    Clipboard.setString(JSON.stringify(report, null, 2));
    Alert.alert(t('settings.advanced.tDiagnostics'), t('settings.advanced.aDiagCopied'));
  };

  const sentLabel = (() => {
    if (!report) return '';
    if (sendState === 'sending') return t('settings.advanced.sDiagSending');
    if (sendState === 'sent' || lastSentId === report.reportId) return t('settings.advanced.sDiagSent');
    if (sendState === 'no_token') return t('settings.advanced.sDiagNoToken');
    if (sendState === 'queued') return t('settings.advanced.sDiagQueued');
    if (sendState === 'disabled') return '';
    return t('settings.advanced.sDiagPending');
  })();

  const visibleChecks = report ? (showAll ? report.checks : report.checks.filter((c) => c.status !== 'ok')) : [];

  return (
    <SettingsSection title={t('settings.advanced.tDiagnostics')} icon="shield-check">
      <Text style={styles.hint}>{t('settings.advanced.hDiagIntro')}</Text>

      <SettingsButton
        title={running ? t(`settings.advanced.sDiagStep.${step ?? 'native'}`) : t('settings.advanced.bRunDiag')}
        icon="play"
        onPress={run}
        loading={running}
        disabled={running}
      />

      {probeScript ? <DiagnosticProbeWebView script={probeScript} /> : null}

      {report && (
        <View style={styles.result}>
          <View style={[styles.verdict, { borderColor: VERDICT_COLOR[report.verdict], backgroundColor: `${VERDICT_COLOR[report.verdict]}22` }]}>
            <Text style={[styles.verdictTitle, { color: VERDICT_COLOR[report.verdict] }]}>
              {t(`settings.advanced.vDiag.${report.verdict}`)}
            </Text>
            <Text style={styles.verdictHeadline}>{report.summary.headline}</Text>
            <Text style={styles.meta}>
              {[report.device.manufacturer, report.device.model].filter(Boolean).join(' ')} · Android {report.device.androidVersion ?? '?'} (API{' '}
              {report.device.apiLevel ?? '?'}) · {report.webview.packageName ? `${report.webview.packageName} ${report.webview.versionName ?? ''}` : 'WebView ?'}
              {typeof report.webview.chromeMajor === 'number' ? ` · Chrome ${report.webview.chromeMajor}` : ''} ·{' '}
              {typeof report.memory.totalMB === 'number' ? `${Math.round(report.memory.totalMB)} MB RAM` : ''}
            </Text>
            <Text style={styles.meta}>
              {t('settings.advanced.lDiagLastRun')}: {new Date(report.generatedAt).toLocaleString()}
              {sentLabel ? ` · ${sentLabel}` : ''}
            </Text>
          </View>

          {GROUPS.map((group) => {
            const rows = visibleChecks.filter((c) => group.prefixes.some((p) => c.id.startsWith(p)));
            if (rows.length === 0) return null;
            return (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupTitle}>{t(`settings.advanced.${group.key}`)}</Text>
                {rows.map((c) => (
                  <View key={c.id} style={styles.row}>
                    <Text style={[styles.glyph, { color: STATUS_GLYPH[c.status].color }]}>{STATUS_GLYPH[c.status].glyph}</Text>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>
                        {t(`settings.advanced.diagCheck.${c.id}`, { defaultValue: c.id })}
                        {c.value !== undefined ? <Text style={styles.rowValue}>  {formatValue(c.value)}</Text> : null}
                      </Text>
                      {c.detail ? <Text style={styles.rowDetail}>{c.detail}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}

          {visibleChecks.length === 0 && !showAll && <Text style={styles.allOk}>{t('settings.advanced.sDiagAllOk')}</Text>}

          <View style={styles.actions}>
            <SettingsButton
              title={showAll ? t('settings.advanced.bDiagShowIssues') : t('settings.advanced.bDiagShowAll')}
              variant="outline"
              size="small"
              onPress={() => setShowAll((v) => !v)}
            />
            <SettingsButton
              title={t('settings.advanced.bSendDiag')}
              icon="sync"
              variant="secondary"
              size="small"
              onPress={resend}
              disabled={sendState === 'sending'}
            />
            <SettingsButton title={t('settings.advanced.bCopyDiag')} variant="outline" size="small" onPress={copyJson} />
          </View>
        </View>
      )}
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm },
  result: { marginTop: Spacing.md, gap: Spacing.sm },
  verdict: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, gap: 4 },
  verdictTitle: { fontSize: 18, fontWeight: '700' },
  verdictHeadline: { color: Colors.textPrimary, fontSize: 14 },
  meta: { color: Colors.textSecondary, fontSize: 12 },
  group: { marginTop: Spacing.sm },
  groupTitle: { color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, gap: 8 },
  glyph: { width: 18, textAlign: 'center', fontWeight: '700', fontSize: 15 },
  rowBody: { flex: 1 },
  rowTitle: { color: Colors.textPrimary, fontSize: 14 },
  rowValue: { color: Colors.textSecondary, fontSize: 13 },
  rowDetail: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  allOk: { color: Colors.success, fontSize: 14, marginTop: Spacing.sm },
  actions: { marginTop: Spacing.sm, gap: Spacing.xs },
});

export default DiagnosticsSection;

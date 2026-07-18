/**
 * FreeKiosk v1.2 - Advanced Tab
 * SSL Certificates, Updates, Reset, Device Owner, REST API
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState, NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SettingsSection,
  SettingsButton,
  SettingsInfoBox,
  BackupRestoreSection,
} from '../../../components/settings';
import { ApiSettingsSection } from '../../../components/ApiSettingsSection';
import { MqttSettingsSection } from '../../../components/MqttSettingsSection';
import { CertificateInfo } from '../../../utils/CertificateModule';
import AccessibilityModule from '../../../utils/AccessibilityModule';
import { Colors, Spacing, Typography } from '../../../theme';

const { KioskModule } = NativeModules;

interface AdvancedTabProps {
  displayMode: 'webview' | 'external_app' | 'media_player';
  isDeviceOwner: boolean;
  
  // Play Store compliance: when false, the entire Updates section is hidden
  enableSelfUpdate: boolean;
  
  // Version & updates
  currentVersion: string;
  checkingUpdate: boolean;
  downloading: boolean;
  updateAvailable: boolean;
  updateInfo: any;
  betaUpdatesEnabled: boolean;
  onBetaUpdatesChange: (value: boolean) => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  
  // SSL Certificates
  certificates: CertificateInfo[];
  onRemoveCertificate: (fingerprint: string, url: string) => void;
  
  // Actions
  onResetSettings: () => void;
  onExitKioskMode: () => void;
  onRemoveDeviceOwner: () => void;
  kioskEnabled: boolean;
  
  // Backup/Restore
  onRestoreComplete?: () => void;
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({
  displayMode,
  isDeviceOwner,
  enableSelfUpdate,
  currentVersion,
  checkingUpdate,
  downloading,
  updateAvailable,
  updateInfo,
  betaUpdatesEnabled,
  onBetaUpdatesChange,
  onCheckForUpdates,
  onDownloadUpdate,
  certificates,
  onRemoveCertificate,
  onResetSettings,
  onExitKioskMode,
  onRemoveDeviceOwner,
  kioskEnabled,
  onRestoreComplete,
}) => {
  const { t } = useTranslation();
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [accessibilityRunning, setAccessibilityRunning] = useState(false);

  const checkAccessibilityStatus = useCallback(async () => {
    try {
      const enabled = await AccessibilityModule.isAccessibilityServiceEnabled();
      const running = await AccessibilityModule.isAccessibilityServiceRunning();
      setAccessibilityEnabled(enabled);
      setAccessibilityRunning(running);
    } catch {
      // Ignore errors on iOS
    }
  }, []);

  useEffect(() => {
    checkAccessibilityStatus();
    // Re-check when the app returns from system settings
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkAccessibilityStatus();
      }
    });
    return () => subscription.remove();
  }, [checkAccessibilityStatus]);

  const handleOpenAccessibilitySettings = async () => {
    try {
      // Use KioskModule.openAndroidSettings which properly handles Lock Task Mode
      // (temporarily exits lock task before launching the settings intent)
      await KioskModule.openAndroidSettings('accessibility');
    } catch (e: any) {
      Alert.alert(t('common.error'), t('settings.advanced.aCouldNotOpenA11y'));
    }
  };

  const handleEnableViaDeviceOwner = async () => {
    try {
      await AccessibilityModule.enableViaDeviceOwner();
      // Re-check status after enabling
      setTimeout(checkAccessibilityStatus, 1000);
      Alert.alert(t('settings.advanced.aSuccess'), t('settings.advanced.aA11yEnabled'));
    } catch (e: any) {
      if (e.code === 'WRITE_SECURE_SETTINGS_REQUIRED') {
        Alert.alert(
          t('settings.advanced.aPermissionRequired'),
          t('settings.advanced.aWriteSecureSettings'),
          [{ text: t('common.ok') }],
        );
      } else {
        Alert.alert(t('common.error'), e.message || t('settings.advanced.aFailedEnable'));
      }
    }
  };
  return (
    <View>
      {/* App Updates - Hidden in Play Store builds (compliance: no in-app updates) */}
      {enableSelfUpdate && (
      <SettingsSection title={t('settings.advanced.tUpdates')} icon="update">
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>{t('settings.advanced.lCurrentVersion')}</Text>
          <Text style={styles.versionValue}>{currentVersion}</Text>
        </View>

        {updateAvailable && updateInfo && (
          <SettingsInfoBox variant="success" title={`🎉 ${updateInfo.isPrerelease ? t('settings.advanced.lBetaPrefix') : ''}${t('settings.advanced.lUpdateAvailable')}`}>
            <Text style={styles.infoText}>
              {t('settings.advanced.iVersionAvailable', { version: updateInfo.version })}{updateInfo.isPrerelease ? t('settings.advanced.iPrerelease') : ''}
              {updateInfo.notes && `\n\n${updateInfo.notes.substring(0, 150)}...`}
            </Text>
          </SettingsInfoBox>
        )}

        <View style={styles.betaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.betaLabel}>{t('settings.advanced.lBetaUpdates')}</Text>
            <Text style={styles.betaHint}>{t('settings.advanced.hBetaUpdates')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.betaToggle, betaUpdatesEnabled && styles.betaToggleActive]}
            onPress={() => onBetaUpdatesChange(!betaUpdatesEnabled)}
          >
            <Text style={[styles.betaToggleText, betaUpdatesEnabled && styles.betaToggleTextActive]}>
              {betaUpdatesEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <SettingsButton
          title={checkingUpdate ? t('settings.advanced.bChecking') : downloading ? t('settings.advanced.bDownloading') : t('settings.advanced.bCheckUpdates')}
          icon={checkingUpdate ? 'timer-sand' : downloading ? 'download' : 'magnify'}
          variant="primary"
          onPress={onCheckForUpdates}
          disabled={checkingUpdate || downloading}
          loading={checkingUpdate}
        />
        
        {updateAvailable && updateInfo && (
          <SettingsButton
            title={downloading ? t('settings.advanced.bDownloading') : t('settings.advanced.bDownloadInstall')}
            icon="download"
            variant="success"
            onPress={onDownloadUpdate}
            disabled={downloading}
            loading={downloading}
          />
        )}
        
        <Text style={styles.hint}>
          {isDeviceOwner ? t('settings.advanced.hUpdateDeviceOwner') : t('settings.advanced.hUpdateNormal')}
        </Text>
      </SettingsSection>
      )}
      
      {/* SSL Certificates - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.advanced.tSslCerts')} icon="certificate-outline">
          <Text style={styles.hint}>
            {t('settings.advanced.hSslCerts')}
          </Text>

          {certificates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('settings.advanced.lNoCerts')}</Text>
            </View>
          ) : (
            <View style={styles.certificatesList}>
              {certificates.map((cert) => (
                <View key={cert.fingerprint} style={styles.certificateItem}>
                  <View style={styles.certificateInfo}>
                    <Text style={styles.certificateUrl} numberOfLines={1}>
                      {cert.url}
                    </Text>
                    <Text style={styles.certificateFingerprint} numberOfLines={1}>
                      {cert.fingerprint.substring(0, 24)}...
                    </Text>
                    <Text style={[styles.certificateExpiry, cert.isExpired && styles.certificateExpired]}>
                      {cert.isExpired ? t('settings.advanced.lExpired') : t('settings.advanced.lExpires')}
                      {cert.expiryDate}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onRemoveCertificate(cert.fingerprint, cert.url)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </SettingsSection>
      )}
      
      {/* REST API - Home Assistant Integration */}
      <ApiSettingsSection />

      {/* MQTT - Home Assistant Integration */}
      <MqttSettingsSection />

      {/* Accessibility Service - Hidden in Play Store builds (BIND_ACCESSIBILITY_SERVICE policy) */}
      {enableSelfUpdate && (
      <SettingsSection title={t('settings.advanced.tAccessibility')} icon="keyboard-outline">
        <View style={styles.accessibilityStatusRow}>
          <Text style={styles.accessibilityStatusLabel}>{t('settings.advanced.lStatus')}</Text>
          <View style={[
            styles.accessibilityStatusBadge,
            { backgroundColor: accessibilityRunning ? Colors.successLight : accessibilityEnabled ? Colors.warningLight : Colors.errorLight },
          ]}>
            <Text style={[
              styles.accessibilityStatusText,
              { color: accessibilityRunning ? Colors.successDark : accessibilityEnabled ? Colors.warningDark : Colors.errorDark },
            ]}>
              {accessibilityRunning ? t('settings.advanced.sActive') : accessibilityEnabled ? t('settings.advanced.sEnabledNotConnected') : t('settings.advanced.sDisabled')}
            </Text>
          </View>
        </View>

        <SettingsInfoBox variant="info" title={t('settings.advanced.tWhyNeeded')}>
          <Text style={styles.infoText}>
            {t('settings.advanced.iAccessibilityWhy')}
          </Text>
        </SettingsInfoBox>

        {!accessibilityRunning && (
          <>
            {isDeviceOwner ? (
              <SettingsButton
                title={t('settings.advanced.bEnableAuto')}
                icon="shield-check"
                variant="primary"
                onPress={handleEnableViaDeviceOwner}
              />
            ) : null}
            <SettingsButton
              title={t('settings.advanced.bOpenAccessibility')}
              icon="open-in-new"
              variant="primary"
              onPress={handleOpenAccessibilitySettings}
            />
            <Text style={styles.hint}>
              {isDeviceOwner
                ? t('settings.advanced.hAccessibilityDeviceOwner')
                : t('settings.advanced.hAccessibilityManual')}
            </Text>
          </>
        )}

        {accessibilityRunning && (
          <Text style={styles.hint}>
            {t('settings.advanced.hAccessibilityActive')}
          </Text>
        )}

        {isDeviceOwner && displayMode === 'external_app' && (
          <SettingsInfoBox variant="info" title={t('settings.advanced.tManagedAppsA11y')}>
            <Text style={styles.infoText}>
              {t('settings.advanced.iManagedAppsA11y')}
            </Text>
          </SettingsInfoBox>
        )}
      </SettingsSection>
      )}

      {/* Backup & Restore */}
      <BackupRestoreSection onRestoreComplete={onRestoreComplete} />

      {/* Android System Settings */}
      <SettingsSection title={t('settings.advanced.tAndroidSettings')} icon="android">
        <Text style={styles.hint}>
          {t('settings.advanced.hAndroidSettings')}
        </Text>
        {kioskEnabled && (
          <SettingsInfoBox variant="info" title={t('settings.advanced.tKioskActive')}>
            <Text style={styles.infoText}>
              {t('settings.advanced.iKioskPaused')}
            </Text>
          </SettingsInfoBox>
        )}
        <SettingsButton
          title={t('settings.advanced.bOpenAndroidSettings')}
          icon="cog"
          variant="primary"
          onPress={() => KioskModule.openAndroidSettings(null)}
        />
        <View style={styles.settingsShortcuts}>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('wifi')}
          >
            <Text style={styles.shortcutText}>📶 WiFi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('sound')}
          >
            <Text style={styles.shortcutText}>{t('settings.advanced.scSound')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('display')}
          >
            <Text style={styles.shortcutText}>{t('settings.advanced.scDisplay')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('bluetooth')}
          >
            <Text style={styles.shortcutText}>📡 Bluetooth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('date')}
          >
            <Text style={styles.shortcutText}>{t('settings.advanced.scDate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => KioskModule.openAndroidSettings('apps')}
          >
            <Text style={styles.shortcutText}>{t('settings.advanced.scApps')}</Text>
          </TouchableOpacity>
        </View>
      </SettingsSection>

      {/* Actions */}
      <SettingsSection title={t('settings.advanced.tActions')} icon="cog-outline">
        <SettingsButton
          title={t('settings.advanced.bResetAll')}
          icon="restart"
          variant="warning"
          onPress={onResetSettings}
        />

        {isDeviceOwner && (
          <SettingsButton
            title={t('settings.advanced.bRemoveDeviceOwner')}
            icon="alert"
            variant="danger"
            onPress={onRemoveDeviceOwner}
          />
        )}

        {kioskEnabled && (
          <SettingsButton
            title={t('settings.advanced.bExitKiosk')}
            icon="exit-to-app"
            variant="danger"
            onPress={onExitKioskMode}
          />
        )}
      </SettingsSection>
      
      {/* Version footer */}
      <Text style={styles.versionFooter}>
        FreeKiosk v{currentVersion}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  versionLabel: {
    ...Typography.body,
  },
  versionValue: {
    ...Typography.label,
    color: Colors.primary,
  },
  hint: {
    ...Typography.hint,
    marginTop: Spacing.sm,
  },
  infoTitle: {
    ...Typography.label,
    color: Colors.infoDark,
    marginBottom: Spacing.sm,
  },
  infoText: {
    ...Typography.body,
    lineHeight: 22,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Spacing.inputRadius,
    marginTop: Spacing.md,
  },
  emptyStateText: {
    ...Typography.body,
    fontStyle: 'italic',
    color: Colors.textHint,
  },
  certificatesList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  certificateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.md,
    borderRadius: Spacing.inputRadius,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateUrl: {
    ...Typography.label,
    fontSize: 14,
    marginBottom: 4,
  },
  certificateFingerprint: {
    ...Typography.mono,
    marginBottom: 4,
  },
  certificateExpiry: {
    ...Typography.hint,
    color: Colors.primary,
  },
  certificateExpired: {
    color: Colors.error,
    fontWeight: '600',
  },
  deleteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  accessibilityStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  accessibilityStatusLabel: {
    ...Typography.body,
    fontWeight: '600',
  },
  accessibilityStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  accessibilityStatusText: {
    ...Typography.label,
    fontSize: 13,
  },
  settingsShortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  shortcutButton: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.inputRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
  },
  shortcutText: {
    ...Typography.label,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  versionFooter: {
    ...Typography.hint,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  betaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  betaLabel: {
    ...Typography.label,
    fontSize: 14,
  },
  betaHint: {
    ...Typography.hint,
    fontSize: 12,
    marginTop: 2,
  },
  betaToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  betaToggleActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  betaToggleText: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.textHint,
  },
  betaToggleTextActive: {
    color: '#2E7D32',
  },
});

export default AdvancedTab;

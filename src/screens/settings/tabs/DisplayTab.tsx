/**
 * FreeKiosk v1.2 - Display Tab
 * Brightness, Status Bar, Keyboard settings
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  SettingsSection,
  SettingsSwitch,
  SettingsSlider,
  SettingsRadioGroup,
  SettingsInfoBox,
  SettingsInput,
} from '../../../components/settings';
import ScreenScheduleRuleCard from '../../../components/settings/ScreenScheduleRuleCard';
import { Colors, Spacing, Typography } from '../../../theme';
import { ScreenScheduleRule } from '../../../types/screenScheduler';
import type { MediaItem } from '../../../types/mediaPlayer';
import { getMediaDisplayName } from '../../../types/mediaPlayer';

interface DisplayTabProps {
  displayMode: 'webview' | 'external_app' | 'media_player';
  
  // Brightness management (allow system to manage)
  brightnessManagementEnabled: boolean;
  onBrightnessManagementEnabledChange: (value: boolean) => void;
  
  // Default brightness
  defaultBrightness: number;
  onDefaultBrightnessChange: (value: number) => void;
  
  // Auto-brightness
  autoBrightnessEnabled: boolean;
  onAutoBrightnessEnabledChange: (value: boolean) => void;
  autoBrightnessMin: number;
  onAutoBrightnessMinChange: (value: number) => void;
  autoBrightnessMax: number;
  onAutoBrightnessMaxChange: (value: number) => void;
  autoBrightnessOffset: number;
  onAutoBrightnessOffsetChange: (value: number) => void;
  currentLightLevel: number;
  hasLightSensor: boolean;
  
  // Status bar
  statusBarEnabled: boolean;
  onStatusBarEnabledChange: (value: boolean) => void;
  statusBarOnOverlay: boolean;
  onStatusBarOnOverlayChange: (value: boolean) => void;
  statusBarOnReturn: boolean;
  onStatusBarOnReturnChange: (value: boolean) => void;
  
  // Status bar items
  showBattery: boolean;
  onShowBatteryChange: (value: boolean) => void;
  showWifi: boolean;
  onShowWifiChange: (value: boolean) => void;
  showBluetooth: boolean;
  onShowBluetoothChange: (value: boolean) => void;
  showVolume: boolean;
  onShowVolumeChange: (value: boolean) => void;
  showTime: boolean;
  onShowTimeChange: (value: boolean) => void;
  statusBarTheme: 'dark' | 'light';
  onStatusBarThemeChange: (value: string) => void;
  
  // Keyboard mode
  keyboardMode: string;
  onKeyboardModeChange: (value: string) => void;
  
  // WebView Zoom Level
  zoomLevel: number;
  onZoomLevelChange: (value: number) => void;
  zoomMode: string;
  onZoomModeChange: (value: string) => void;
  disableUserZoom: boolean;
  onDisableUserZoomChange: (value: boolean) => void;
  
  // Custom User Agent
  customUserAgent: string;
  onCustomUserAgentChange: (value: string) => void;
  pauseWebMediaWhenHidden: boolean;
  onPauseWebMediaWhenHiddenChange: (value: boolean) => void;
  intercomModeEnabled: boolean;
  onIntercomModeChange: (value: boolean) => void;

  // Screensaver
  screensaverEnabled: boolean;
  onScreensaverEnabledChange: (value: boolean) => void;
  screensaverBrightness: number;
  onScreensaverBrightnessChange: (value: number) => void;
  inactivityDelay: string;
  onInactivityDelayChange: (value: string) => void;

  // Screensaver style (dim/url/video)
  screensaverType: 'dim' | 'url' | 'video';
  onScreensaverTypeChange: (value: 'dim' | 'url' | 'video') => void;
  screensaverUrl: string;
  onScreensaverUrlChange: (value: string) => void;
  screensaverVideoItems: MediaItem[];
  onScreensaverVideoItemsChange: (items: MediaItem[]) => void;
  screensaverVideoLoop: boolean;
  onScreensaverVideoLoopChange: (value: boolean) => void;
  onPickScreensaverMedia: (type: 'video' | 'image' | 'any') => void;
  pickingScreensaverMedia: boolean;

  // Motion detection
  motionEnabled: boolean;
  onMotionEnabledChange: (value: boolean) => void;
  motionSensitivity: 'low' | 'medium' | 'high';
  onMotionSensitivityChange: (value: 'low' | 'medium' | 'high') => void;
  motionCameraPosition: 'front' | 'back';
  onMotionCameraPositionChange: (value: 'front' | 'back') => void;
  availableCameras: Array<{position: 'front' | 'back', id: string}>;
  
  // Screen Sleep Scheduler
  screenSchedulerEnabled: boolean;
  onScreenSchedulerEnabledChange: (value: boolean) => void;
  screenSchedulerRules: ScreenScheduleRule[];
  onScreenSchedulerRulesChange: (rules: ScreenScheduleRule[]) => void;
  screenSchedulerWakeOnTouch: boolean;
  onScreenSchedulerWakeOnTouchChange: (value: boolean) => void;
  onAddScheduleRule: () => void;
  onEditScheduleRule: (rule: ScreenScheduleRule) => void;
  
  // Keep Screen On
  keepScreenOn: boolean;
  onKeepScreenOnChange: (value: boolean) => void;

  // Auto Wake on Screen Off
  autoWakeOnScreenOff: boolean;
  onAutoWakeOnScreenOffChange: (value: boolean) => void;
}

const DisplayTab: React.FC<DisplayTabProps> = ({
  displayMode,
  brightnessManagementEnabled,
  onBrightnessManagementEnabledChange,
  defaultBrightness,
  onDefaultBrightnessChange,
  autoBrightnessEnabled,
  onAutoBrightnessEnabledChange,
  autoBrightnessMin,
  onAutoBrightnessMinChange,
  autoBrightnessMax,
  onAutoBrightnessMaxChange,
  autoBrightnessOffset,
  onAutoBrightnessOffsetChange,
  currentLightLevel,
  hasLightSensor,
  statusBarEnabled,
  onStatusBarEnabledChange,
  statusBarOnOverlay,
  onStatusBarOnOverlayChange,
  statusBarOnReturn,
  onStatusBarOnReturnChange,
  showBattery,
  onShowBatteryChange,
  showWifi,
  onShowWifiChange,
  showBluetooth,
  onShowBluetoothChange,
  showVolume,
  onShowVolumeChange,
  showTime,
  onShowTimeChange,
  statusBarTheme,
  onStatusBarThemeChange,
  keyboardMode,
  onKeyboardModeChange,
  zoomLevel,
  onZoomLevelChange,
  zoomMode,
  onZoomModeChange,
  disableUserZoom,
  onDisableUserZoomChange,
  customUserAgent,
  onCustomUserAgentChange,
  pauseWebMediaWhenHidden,
  onPauseWebMediaWhenHiddenChange,
  intercomModeEnabled,
  onIntercomModeChange,
  screensaverEnabled,
  onScreensaverEnabledChange,
  screensaverBrightness,
  onScreensaverBrightnessChange,
  inactivityDelay,
  onInactivityDelayChange,
  screensaverType,
  onScreensaverTypeChange,
  screensaverUrl,
  onScreensaverUrlChange,
  screensaverVideoItems,
  onScreensaverVideoItemsChange,
  screensaverVideoLoop,
  onScreensaverVideoLoopChange,
  onPickScreensaverMedia,
  pickingScreensaverMedia,
  motionEnabled,
  onMotionEnabledChange,
  motionSensitivity,
  onMotionSensitivityChange,
  motionCameraPosition,
  onMotionCameraPositionChange,
  availableCameras,
  screenSchedulerEnabled,
  onScreenSchedulerEnabledChange,
  screenSchedulerRules,
  onScreenSchedulerRulesChange,
  screenSchedulerWakeOnTouch,
  onScreenSchedulerWakeOnTouchChange,
  keepScreenOn,
  onKeepScreenOnChange,
  autoWakeOnScreenOff,
  onAutoWakeOnScreenOffChange,
  onAddScheduleRule,
  onEditScheduleRule,
}) => {
  const { t } = useTranslation();
  const handleCameraPositionChange = (value: string) => {
    if (value === 'front' || value === 'back') {
      onMotionCameraPositionChange(value);
    }
  };

  const handleMotionSensitivityChange = (value: string) => {
    if (value === 'low' || value === 'medium' || value === 'high') {
      onMotionSensitivityChange(value);
    }
  };

  // Generate camera options from available cameras (deduplicated by position)
  const uniquePositions = Array.from(new Set(availableCameras.map(cam => cam.position)));
  const cameraOptions = uniquePositions.map(position => ({
    label: position === 'front' ? 'Front Camera' : 'Back Camera',
    value: position,
  }));

  // Check whether the selected camera is available on this device
  const selectedCameraAvailable = availableCameras.some(cam => cam.position === motionCameraPosition);

  return (
    <View>
      {/* App Brightness Control toggle - WebView mode only (external app mode doesn't manage brightness) */}
      {displayMode !== 'external_app' && (
        <SettingsSection title={t('settings.display.tBrightness')} icon="brightness-6">
          <SettingsSwitch
            label={t('settings.display.lBrightnessControl')}
            hint={brightnessManagementEnabled
              ? "FreeKiosk manages screen brightness"
              : "System manages brightness (Tasker, Android settings, etc.)"}
            value={brightnessManagementEnabled}
            onValueChange={onBrightnessManagementEnabledChange}
          />
          {!brightnessManagementEnabled && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                💡 Brightness is managed by the system. External tools like Tasker can control brightness without interference from FreeKiosk.
              </Text>
            </SettingsInfoBox>
          )}
        </SettingsSection>
      )}

      {/* Default Brightness - Only in WebView mode and when app manages brightness */}
      {displayMode !== 'external_app' && brightnessManagementEnabled && (
        <SettingsSection title={t('settings.display.tManualBright')} icon="brightness-6">
          <SettingsSlider
            label=""
            hint={autoBrightnessEnabled 
              ? "Disabled while auto-brightness is active" 
              : "Screen brightness level (0% - 100%)"}
            value={defaultBrightness}
            onValueChange={onDefaultBrightnessChange}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            disabled={autoBrightnessEnabled}
          />
          {autoBrightnessEnabled && (
            <SettingsInfoBox variant="warning">
              <Text style={styles.infoText}>
                ⚠️ Manual brightness control is disabled while auto-brightness is active
              </Text>
            </SettingsInfoBox>
          )}
        </SettingsSection>
      )}
      
      {/* Auto-Brightness - WebView only, and only when app manages brightness */}
      {displayMode !== 'external_app' && brightnessManagementEnabled && (
        <SettingsSection title={t('settings.display.tAutoBright')} icon="brightness-auto">
          <SettingsSwitch
            label={t('settings.display.lEnableAuto')}
            hint={t('settings.display.hAutoBright')}
            value={autoBrightnessEnabled}
            onValueChange={onAutoBrightnessEnabledChange}
            disabled={!hasLightSensor}
          />
          
          {!hasLightSensor && (
            <SettingsInfoBox variant="error">
              <Text style={styles.infoText}>
                ⚠️ Light sensor not available on this device
              </Text>
            </SettingsInfoBox>
          )}
          
          {hasLightSensor && autoBrightnessEnabled && (
            <>
              <SettingsSlider
                label={t('settings.display.lMinBright')}
                hint={t('settings.display.hMinBright')}
                value={autoBrightnessMin}
                onValueChange={onAutoBrightnessMinChange}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                presets={[
                  { label: '5%', value: 0.05 },
                  { label: '10%', value: 0.1 },
                  { label: '20%', value: 0.2 },
                ]}
              />
              
              <SettingsSlider
                label={t('settings.display.lMaxBright')}
                hint={t('settings.display.hMaxBright')}
                value={autoBrightnessMax}
                onValueChange={onAutoBrightnessMaxChange}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                presets={[
                  { label: '80%', value: 0.8 },
                  { label: '90%', value: 0.9 },
                  { label: '100%', value: 1.0 },
                ]}
              />
              
              <SettingsSlider
                label={t('settings.display.lBrightOffset')}
                hint={t('settings.display.hOffset')}
                value={autoBrightnessOffset}
                onValueChange={onAutoBrightnessOffsetChange}
                minimumValue={0}
                maximumValue={0.5}
                step={0.05}
                presets={[
                  { label: '0%', value: 0 },
                  { label: '+10%', value: 0.1 },
                  { label: '+20%', value: 0.2 },
                ]}
              />
              
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  💡 Current Light Level: {currentLightLevel.toFixed(1)} lux
                </Text>
              </SettingsInfoBox>
            </>
          )}
        </SettingsSection>
      )}
      
      {/* Screen Always On - WebView mode only (external app mode: system manages screen) */}
      {displayMode !== 'external_app' && (
      <SettingsSection title={t('settings.display.tAlwaysOn')} icon="monitor">
        <SettingsSwitch
          label={t('settings.display.lKeepOn')}
          hint={keepScreenOn
            ? "Screen stays on permanently (standard kiosk behavior)"
            : "System manages screen timeout — display turns off after inactivity like a normal device"}
          value={keepScreenOn}
          onValueChange={onKeepScreenOnChange}
        />
        {!keepScreenOn && (
          <SettingsInfoBox variant="warning">
            <Text style={styles.infoText}>
              ⚠️ The device will use its Android display timeout setting to turn the screen off automatically.{`\n`}
              Configure the timeout in Android Settings → Display → Screen Timeout.{`\n`}
              Screensaver is disabled when screen management is left to the system.
            </Text>
          </SettingsInfoBox>
        )}
        <SettingsSwitch
          label={t('settings.display.lAutoWake')}
          hint={autoWakeOnScreenOff
            ? "Screen will automatically turn back on when turned off (e.g. by power button)"
            : "Screen stays off when turned off by power button or system"}
          value={autoWakeOnScreenOff}
          onValueChange={onAutoWakeOnScreenOffChange}
        />
        {autoWakeOnScreenOff && (
          <SettingsInfoBox variant="info">
            <Text style={styles.infoText}>
              {t('settings.display.iAutoWake')}
            </Text>
          </SettingsInfoBox>
        )}
      </SettingsSection>
      )}
      
      {/* Screensaver - available in all display modes (keepScreenOn required for webview/media_player) */}
      {(displayMode === 'external_app' || keepScreenOn) && (
        <SettingsSection title={t('settings.display.tScreensaver')} icon="weather-night">
          <SettingsSwitch
            label={t('settings.display.lEnableSaver')}
            hint={t('settings.display.hEnableSaver')}
            value={screensaverEnabled}
            onValueChange={onScreensaverEnabledChange}
          />

          {displayMode === 'external_app' && screensaverEnabled && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                ℹ️ In External App mode the system manages the screen. For the screensaver to
                appear before the device turns the screen off on its own, set the Android screen
                timeout to a value greater than or equal to the inactivity delay below — or to
                "Never" (Android Settings → Display → Screen Timeout).
              </Text>
            </SettingsInfoBox>
          )}

          {screensaverEnabled && (
            <>
              {/* {t('settings.display.iSaverStyle')} (dim / url / video) */}
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>{t('settings.display.iSaverStyle')}</Text>
                <SettingsRadioGroup
                  options={[
                    { label: t('settings.display.lDimOnly'), value: 'dim', hint: t('settings.display.hDimBehavior') },
                    { label: t('settings.display.lWebPage'), value: 'url', hint: t('settings.display.hShowWebPage') },
                    { label: t('settings.display.lVideoImage'), value: 'video', hint: t('settings.display.hSlideshow') },
                  ]}
                  value={screensaverType}
                  onValueChange={(v) => onScreensaverTypeChange(v as 'dim' | 'url' | 'video')}
                />

                {screensaverType === 'url' && (
                  <>
                    <SettingsInput
                      label={t('settings.display.lSaverUrl')}
                      value={screensaverUrl}
                      onChangeText={onScreensaverUrlChange}
                      placeholder={t('settings.display.phClock')}
                      keyboardType="url"
                      autoCapitalize="none"
                      hint={t('settings.display.hReadOnly')}
                    />
                    {screensaverUrl.trim().length > 0 && (() => {
                      try { new URL(screensaverUrl.trim()); return null; } catch {
                        return (
                          <SettingsInfoBox variant="error">
                            <Text style={styles.infoText}>
                              ⚠️ Invalid URL. Enter a full URL starting with https:// or http://
                            </Text>
                          </SettingsInfoBox>
                        );
                      }
                    })()}
                  </>
                )}

                {screensaverType === 'video' && (
                  <>
                    <SettingsInfoBox variant="info">
                      <Text style={styles.infoText}>
                        {'🎬 Pick a video or image from your device.\n'}
                        {'Multiple items play as a slideshow.'}
                      </Text>
                    </SettingsInfoBox>
                    <TouchableOpacity
                      style={[styles.ssPickButton, pickingScreensaverMedia && styles.ssPickButtonDisabled]}
                      onPress={() => !pickingScreensaverMedia && onPickScreensaverMedia('any')}
                      disabled={pickingScreensaverMedia}
                    >
                      <Text style={styles.ssPickButtonText}>
                        {pickingScreensaverMedia ? '⏳ Picking…' : '📁 Pick from Device'}
                      </Text>
                    </TouchableOpacity>

                    {screensaverVideoItems.map((item, index) => (
                      <View key={item.id} style={styles.ssMediaCard}>
                        <Text style={styles.ssMediaIndex}>{index + 1}</Text>
                        <Text style={styles.ssMediaName} numberOfLines={1}>
                          {item.type === 'video' ? '🎥 ' : '🖼️ '}{getMediaDisplayName(item)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            onScreensaverVideoItemsChange(screensaverVideoItems.filter(i => i.id !== item.id));
                          }}
                        >
                          <Text style={styles.ssMediaDelete}>✗</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <SettingsSwitch
                      label={t('settings.display.lLoopPlaylist')}
                      hint={t('settings.display.hLoopEnd')}
                      value={screensaverVideoLoop}
                      onValueChange={onScreensaverVideoLoopChange}
                    />

                    {screensaverVideoItems.length === 0 && (
                      <SettingsInfoBox variant="warning">
                        <Text style={styles.infoText}>
                          ⚠️ No media selected. The screensaver will appear blank until you pick at least one item.
                        </Text>
                      </SettingsInfoBox>
                    )}
                  </>
                )}

                {(screensaverType === 'url' || screensaverType === 'video') && screensaverBrightness < 0.1 && brightnessManagementEnabled && (
                  <SettingsInfoBox variant="warning">
                    <Text style={styles.infoText}>
                      ⚠️ {t('settings.display.iSaverBright')} is below 10%. Raise it (see slider below) so the content is visible, or switch to Dim Only.
                    </Text>
                  </SettingsInfoBox>
                )}
              </View>

              {/* {t('settings.display.iSaverBright')} - only when app manages brightness */}
              {brightnessManagementEnabled && (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>{t('settings.display.iSaverBright')}</Text>
                  <SettingsSlider
                    label=""
                    hint={t('settings.display.hSaverBright')}
                    value={screensaverBrightness}
                    onValueChange={onScreensaverBrightnessChange}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    presets={[
                      { label: t('settings.display.lBlackScreen'), value: 0 },
                      { label: t('settings.display.lVeryDim'), value: 0.05 },
                      { label: t('settings.display.lDim'), value: 0.1 },
                    ]}
                  />
                </View>
              )}
              
              {/* {t('settings.display.iInactDelay')} */}
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>{t('settings.display.iInactDelay')}</Text>
                <SettingsInput
                  label=""
                  value={inactivityDelay}
                  onChangeText={(text) => {
                    if (/^\d*$/.test(text)) {
                      onInactivityDelayChange(text);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="10"
                  hint={t('settings.display.hSaverDelay')}
                />
              </View>
              
              {/* {t('settings.display.iMotion')} */}
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>{t('settings.display.iMotion')}</Text>
                <SettingsSwitch
                  label={t('settings.display.lEnableDetection')}
                  hint={t('settings.display.hMotionWake')}
                  value={motionEnabled}
                  onValueChange={onMotionEnabledChange}
                />
                
                {motionEnabled && (
                  <>
                    <SettingsRadioGroup
                      label={t('settings.display.lSensitivity')}
                      hint={t('settings.display.hSensitivity')}
                      options={[
                        { label: t('settings.display.lLow'), value: 'low' },
                        { label: t('settings.display.lMedium'), value: 'medium' },
                        { label: t('settings.display.lHigh'), value: 'high' },
                      ]}
                      value={motionSensitivity}
                      onValueChange={handleMotionSensitivityChange}
                    />

                    {availableCameras.length === 0 && (
                      <SettingsInfoBox variant="error">
                        <Text style={styles.infoText}>
                          ⚠️ No camera detected on this device
                        </Text>
                      </SettingsInfoBox>
                    )}
                    
                    {availableCameras.length === 1 && (
                      <SettingsInfoBox variant="info">
                        <Text style={styles.infoText}>
                          📹 Using {availableCameras[0].position === 'front' ? 'Front' : 'Back'} Camera (only camera available)
                        </Text>
                      </SettingsInfoBox>
                    )}
                    
                    {availableCameras.length > 1 && (
                      <>
                        <SettingsRadioGroup
                          label={t('settings.display.lCameraPos')}
                          hint={t('settings.display.hSelectCamera')}
                          options={cameraOptions}
                          value={motionCameraPosition}
                          onValueChange={handleCameraPositionChange}
                        />
                        
                        {!selectedCameraAvailable && (
                          <SettingsInfoBox variant="warning">
                            <Text style={styles.infoText}>
                              ⚠️ Selected camera not available on this device
                            </Text>
                          </SettingsInfoBox>
                        )}
                      </>
                    )}

                  </>
                )}
              </View>
              
              {/* How it works */}
              <View style={styles.subSection}>
                <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
                <Text style={styles.infoText}>
                  • After {inactivityDelay || '10'} minute(s) without interaction, the screensaver activates{`
`}
                  {displayMode === 'external_app'
                    ? `• FreeKiosk comes to the foreground to show the screensaver; the external app resumes on wake
`
                    : ''}
                  • Touch the screen to wake the device{`
`}
                  {motionEnabled && `• Motion in front of the camera also wakes the screen
`}
                  • Normal brightness is restored automatically
                </Text>
              </View>
            </>
          )}
        </SettingsSection>
      )}
      
      {/* Screen Sleep Scheduler */}
      <SettingsSection title={t('settings.display.tSleepSchedule')} icon="power-sleep">
        <SettingsSwitch
          label={t('settings.display.lEnableSchedule')}
          hint={t('settings.display.hSchedule')}
          value={screenSchedulerEnabled}
          onValueChange={onScreenSchedulerEnabledChange}
        />
        
        {screenSchedulerEnabled && (
          <>
            {/* {t('settings.display.iScheduleRules')} List */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>{t('settings.display.iScheduleRules')}</Text>
              {screenSchedulerRules.length === 0 ? (
                <SettingsInfoBox variant="info">
                  <Text style={styles.infoText}>
                    {t('settings.display.iNoRules')}
                  </Text>
                </SettingsInfoBox>
              ) : (
                <View style={styles.rulesContainer}>
                  {screenSchedulerRules.map((rule) => (
                    <ScreenScheduleRuleCard
                      key={rule.id}
                      rule={rule}
                      onToggle={(id, enabled) => {
                        onScreenSchedulerRulesChange(
                          screenSchedulerRules.map(r =>
                            r.id === id ? { ...r, enabled } : r
                          )
                        );
                      }}
                      onEdit={onEditScheduleRule}
                      onDelete={(id) => {
                        Alert.alert(
                          'Delete Rule',
                          'Are you sure you want to delete this schedule rule?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                onScreenSchedulerRulesChange(
                                  screenSchedulerRules.filter(r => r.id !== id)
                                );
                              },
                            },
                          ]
                        );
                      }}
                    />
                  ))}
                </View>
              )}
              
              <TouchableOpacity style={styles.addRuleButton} onPress={onAddScheduleRule}>
                <Text style={styles.addRuleButtonText}>➕ Add Schedule Rule</Text>
              </TouchableOpacity>
            </View>
            
            {/* Wake on Touch option */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>{t('settings.display.iWakeOptions')}</Text>
              <SettingsSwitch
                label={t('settings.display.lWakeOnTouch')}
                hint={t('settings.display.hWakeTouch')}
                value={screenSchedulerWakeOnTouch}
                onValueChange={onScreenSchedulerWakeOnTouchChange}
              />
              {!screenSchedulerWakeOnTouch && (
                <SettingsInfoBox variant="warning">
                  <Text style={styles.infoText}>
                    ⚠️ Touch will not wake the screen during sleep periods. Use the scheduled wake time or REST API to turn screen back on.
                  </Text>
                </SettingsInfoBox>
              )}
            </View>
            
            {/* How it works */}
            <View style={styles.subSection}>
              <Text style={styles.infoTitle}>ℹ️ How Screen Schedule Works</Text>
              <Text style={styles.infoText}>
                • Screen turns OFF automatically at the scheduled sleep time{`\n`}
                • Screen turns ON automatically at the scheduled wake time{`\n`}
                • Multiple rules can cover different days/times{`\n`}
                • Overnight rules (e.g., 22:00→07:00) are supported{`\n`}
                {screenSchedulerWakeOnTouch
                  ? '• Touch the screen to temporarily wake it during sleep\n'
                  : '• Touch wake is disabled during sleep periods\n'
                }
                {`\n`}
                {'📱 Device Owner: screen is truly locked (lockNow) + native alarm for wake\n'}
                {'📱 Non Device Owner: brightness set to 0 + black overlay\n'}
                {'⏰ Wake alarm uses Android AlarmManager for reliable timing'}
              </Text>
            </View>
          </>
        )}
      </SettingsSection>
      
      {/* Status Bar */}
      <SettingsSection title={t('settings.display.tStatusBar')} icon="chart-bar">
        <SettingsSwitch
          label={t('settings.display.lShowStatusBar')}
          hint={t('settings.display.hStatusBar')}
          value={statusBarEnabled}
          onValueChange={onStatusBarEnabledChange}
        />
        
        {statusBarEnabled && (
          <View style={styles.subSection}>
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                {t('settings.display.iLayout')}
              </Text>
            </SettingsInfoBox>

            <SettingsRadioGroup
              label={t('settings.display.lStatusTheme')}
              hint={t('settings.display.hStatusTheme')}
              options={[
                {
                  value: 'dark',
                  label: t('settings.display.lDark'),
                  hint: t('settings.display.hDarkBg'),
                  icon: 'weather-night',
                },
                {
                  value: 'light',
                  label: t('settings.display.lLight'),
                  hint: t('settings.display.hLightBg'),
                  icon: 'brightness-7',
                },
              ]}
              value={statusBarTheme}
              onValueChange={onStatusBarThemeChange}
            />
            
            {/* Customize Status Bar Items */}
            <Text style={styles.subSectionTitle}>{t('settings.display.iCustomizeItems')}</Text>
            
            <View style={styles.itemsGrid}>
              <SettingsSwitch
                label={t('settings.display.lBattery')}
                icon="power"
                value={showBattery}
                onValueChange={onShowBatteryChange}
              />
              
              <SettingsSwitch
                label="Wi-Fi"
                icon="server-network"
                value={showWifi}
                onValueChange={onShowWifiChange}
              />
              
              <SettingsSwitch
                label="Bluetooth"
                icon="remote"
                value={showBluetooth}
                onValueChange={onShowBluetoothChange}
              />
              
              <SettingsSwitch
                label={t('settings.display.lVolume')}
                icon="volume-high"
                value={showVolume}
                onValueChange={onShowVolumeChange}
              />
              
              <SettingsSwitch
                label={t('settings.display.lTime')}
                icon="clock-outline"
                value={showTime}
                onValueChange={onShowTimeChange}
              />
            </View>
            
            {/* External App specific options */}
            {displayMode === 'external_app' && (
              <View style={styles.externalAppOptions}>
                <Text style={styles.subSectionTitle}>{t('settings.display.iExtAppOptions')}</Text>
                
                <SettingsSwitch
                  label={t('settings.display.lOnExternalApp')}
                  hint={t('settings.display.hStatusOverlay')}
                  value={statusBarOnOverlay}
                  onValueChange={onStatusBarOnOverlayChange}
                />
                
                <SettingsSwitch
                  label={t('settings.display.lOnReturn')}
                  hint={t('settings.display.hStatusReturn')}
                  value={statusBarOnReturn}
                  onValueChange={onStatusBarOnReturnChange}
                />
              </View>
            )}
            
            {(displayMode === 'webview' || displayMode === 'media_player') && (
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  {displayMode === 'webview' ? 'WebView' : 'Media Player'} mode: Status bar appears above the web content
                </Text>
              </SettingsInfoBox>
            )}
          </View>
        )}
      </SettingsSection>
      
      {/* Web Page Zoom - Only in WebView mode */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.display.tZoom')} icon="magnify">
          <SettingsRadioGroup
            hint={t('settings.display.hZoomApply')}
            options={[
              {
                value: 'standard',
                label: t('settings.display.lStandard'),
                hint: t('settings.display.hZoomDoc'),
              },
              {
                value: 'fit',
                label: 'Home Assistant',
                hint: t('settings.display.hZoomBody'),
              },
            ]}
            value={zoomMode}
            onValueChange={onZoomModeChange}
          />
          {zoomMode === 'fit' && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                🏠 Home Assistant mode zooms the page body (the HADashboard method), so dashboards re-flow and fill the screen instead of cards overflowing. If a non-HA site looks off, switch back to "Standard".
              </Text>
            </SettingsInfoBox>
          )}
          <SettingsSlider
            label=""
            hint={`Zoom level: ${zoomLevel}% — Adjusts how web pages are rendered. 100% matches Chrome's default.`}
            value={zoomLevel}
            onValueChange={(val) => onZoomLevelChange(Math.round(val))}
            minimumValue={50}
            maximumValue={200}
            step={5}
            formatValue={(val) => `${Math.round(val)}%`}
            presets={[
              { label: '75%', value: 75 },
              { label: '100%', value: 100 },
              { label: '125%', value: 125 },
              { label: '150%', value: 150 },
            ]}
          />
          {zoomLevel !== 100 && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                🔍 Zoom is set to {zoomLevel}%. Tap the "100%" preset to reset to default.
              </Text>
            </SettingsInfoBox>
          )}
          <SettingsSwitch
            label={t('settings.display.lDisableZoom')}
            hint={t('settings.display.hDisableZoom')}
            value={disableUserZoom}
            onValueChange={onDisableUserZoomChange}
          />
        </SettingsSection>
      )}
      
      {/* Custom User Agent - Only in WebView mode */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.display.tUserAgent')} icon="web">
          <SettingsInput
            label={t('settings.display.lCustomUA')}
            hint={customUserAgent.trim() ? 'Custom UA active. Clear the field to use the default.' : 'Leave empty to use the default modern Chrome User Agent. Some hosting providers (e.g. SiteGround) block old or suspicious User Agents.'}
            value={customUserAgent}
            onChangeText={onCustomUserAgentChange}
            placeholder="Mozilla/5.0 (Linux; Android 13; ...) Chrome/131..."
            autoCapitalize="none"
            multiline={true}
          />
          {customUserAgent.trim() !== '' && (
            <SettingsInfoBox variant="warning">
              <Text style={styles.infoText}>
                ⚠️ Custom User Agent is active. Some sites may behave unexpectedly with non-standard UA strings.
              </Text>
            </SettingsInfoBox>
          )}
        </SettingsSection>
      )}
      
      {/* Web Media playback - Only in WebView mode (#177) */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.display.tWebMedia')} icon="volume-off">
          <SettingsSwitch
            label={t('settings.display.lPauseMedia')}
            hint={t('settings.display.hPauseMedia')}
            value={pauseWebMediaWhenHidden}
            onValueChange={onPauseWebMediaWhenHiddenChange}
          />
          <SettingsSwitch
            label={t('settings.display.l2wayAudio')}
            hint={t('settings.display.h2way')}
            value={intercomModeEnabled}
            onValueChange={onIntercomModeChange}
          />
        </SettingsSection>
      )}

      {/* Keyboard Mode - Only in WebView mode */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.display.tKeyboard')} icon="keyboard-outline">
          <SettingsRadioGroup
            hint={t('settings.display.hKeyboard')}
            options={[
              {
                value: 'default',
                label: t('settings.display.lDefault'),
                hint: t('settings.display.hRespectSite'),
              },
              {
                value: 'force_numeric',
                label: t('settings.display.lForceNumeric'),
                hint: t('settings.display.hAllNumeric'),
              },
              {
                value: 'smart',
                label: t('settings.display.lSmartDetect'),
                hint: t('settings.display.hNumericOnly'),
              },
            ]}
            value={keyboardMode}
            onValueChange={onKeyboardModeChange}
          />
        </SettingsSection>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  subSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  subSectionTitle: {
    ...Typography.labelSmall,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemsGrid: {
    gap: Spacing.xs,
  },
  externalAppOptions: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  infoText: {
    ...Typography.body,
    color: Colors.infoDark,
  },
  infoTitle: {
    ...Typography.label,
    color: Colors.infoDark,
    marginBottom: Spacing.sm,
  },
  rulesContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addRuleButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  addRuleButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  ssPickButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  ssPickButtonDisabled: {
    opacity: 0.5,
  },
  ssPickButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  ssMediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginVertical: Spacing.xs,
  },
  ssMediaIndex: {
    fontWeight: '600',
    marginRight: Spacing.sm,
    color: Colors.textSecondary,
    minWidth: 20,
  },
  ssMediaName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  ssMediaDelete: {
    color: Colors.error,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: Spacing.sm,
  },
});

export default DisplayTab;

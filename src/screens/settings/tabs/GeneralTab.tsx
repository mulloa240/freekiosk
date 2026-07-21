/**
 * FreeKiosk v1.2 - General Tab
 * Display mode, URL/App selection, PIN configuration
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import {
  SettingsSection,
  SettingsInput,
  SettingsSwitch,
  SettingsModeSelector,
  SettingsInfoBox,
  SettingsButton,
  UrlListEditor,
  ScheduleEventList,
  ManagedAppsSection,
  SettingsRadioGroup,
} from '../../../components/settings';
import { ManagedApp } from '../../../types/managedApps';
import { buildSomelierUrl, extractSomelierToken } from '../../../config/somelier';
import { Colors, Spacing, Typography } from '../../../theme';
import AppLauncherModule, { AppInfo } from '../../../utils/AppLauncherModule';
import { ScheduledEvent } from '../../../types/planner';
import type { MediaItem, MediaFitMode } from '../../../types/mediaPlayer';
import { generateMediaItemId, detectMediaType, isLocalMedia, getMediaDisplayName } from '../../../types/mediaPlayer';
import FilePickerModule from '../../../utils/FilePickerModule';
import type { PickedFile } from '../../../utils/FilePickerModule';

interface GeneralTabProps {
  // Display mode
  displayMode: 'webview' | 'external_app' | 'media_player';
  onDisplayModeChange: (mode: 'webview' | 'external_app' | 'media_player') => void;
  
  // WebView settings
  url: string;
  onUrlChange: (url: string) => void;
  
  // External app settings
  externalAppPackage: string;
  onExternalAppPackageChange: (pkg: string) => void;
  onPickApp: () => void;
  loadingApps: boolean;
  
  // External app sub-mode (single vs multi)
  externalAppMode: 'single' | 'multi';
  onExternalAppModeChange: (mode: 'single' | 'multi') => void;
  
  // Managed apps (multi-app mode)
  managedApps: ManagedApp[];
  onManagedAppsChange: (apps: ManagedApp[]) => void;
  
  // Permissions
  hasOverlayPermission: boolean;
  onRequestOverlayPermission: () => void;
  hasUsageStatsPermission: boolean;
  onRequestUsageStatsPermission: () => void;
  isDeviceOwner: boolean;
  
  // PIN
  pin: string;
  onPinChange: (pin: string) => void;
  isPinConfigured: boolean;
  pinModeChanged: boolean;
  pinMaxAttemptsText: string;
  onPinMaxAttemptsChange: (text: string) => void;
  onPinMaxAttemptsBlur: () => void;
  pinMode: 'numeric' | 'alphanumeric';
  onPinModeChange: (mode: 'numeric' | 'alphanumeric') => void;
  
  // Dashboard mode (webview only)
  dashboardModeEnabled: boolean;
  onDashboardModeEnabledChange: (value: boolean) => void;

  // Auto reload (webview only)
  autoReload: boolean;
  onAutoReloadChange: (value: boolean) => void;
  
  // PDF Viewer (webview only)
  pdfViewerEnabled: boolean;
  onPdfViewerEnabledChange: (value: boolean) => void;
  
  // Printing (webview only)
  printEnabled: boolean;
  onPrintEnabledChange: (value: boolean) => void;
  printPaperSize: string;
  onPrintPaperSizeChange: (value: string) => void;
  
  // URL Rotation (webview only)
  urlRotationEnabled: boolean;
  onUrlRotationEnabledChange: (value: boolean) => void;
  urlRotationList: string[];
  onUrlRotationListChange: (urls: string[]) => void;
  urlRotationInterval: string;
  onUrlRotationIntervalChange: (value: string) => void;
  
  // URL Planner (webview only)
  urlPlannerEnabled: boolean;
  onUrlPlannerEnabledChange: (value: boolean) => void;
  urlPlannerEvents: ScheduledEvent[];
  onUrlPlannerEventsChange: (events: ScheduledEvent[]) => void;
  onAddRecurringEvent: () => void;
  onAddOneTimeEvent: () => void;
  onEditEvent: (event: ScheduledEvent) => void;
  
  // WebView Back Button (webview only)
  webViewBackButtonEnabled: boolean;
  onWebViewBackButtonEnabledChange: (value: boolean) => void;
  webViewBackButtonXPercent: string;
  onWebViewBackButtonXPercentChange: (value: string) => void;
  webViewBackButtonYPercent: string;
  onWebViewBackButtonYPercentChange: (value: string) => void;
  onResetWebViewBackButtonPosition: () => void;
  
  // Inactivity Return to Home (webview only)
  inactivityReturnEnabled: boolean;
  onInactivityReturnEnabledChange: (value: boolean) => void;
  inactivityReturnDelay: string;
  onInactivityReturnDelayChange: (value: string) => void;
  inactivityReturnResetOnNav: boolean;
  onInactivityReturnResetOnNavChange: (value: boolean) => void;
  inactivityReturnClearCache: boolean;
  onInactivityReturnClearCacheChange: (value: boolean) => void;
  inactivityReturnScrollTop: boolean;
  onInactivityReturnScrollTopChange: (value: boolean) => void;
  
  // Media Player settings
  mediaPlayerItems: MediaItem[];
  onMediaPlayerItemsChange: (items: MediaItem[]) => void;
  mediaPlayerAutoPlay: boolean;
  onMediaPlayerAutoPlayChange: (value: boolean) => void;
  mediaPlayerLoop: boolean;
  onMediaPlayerLoopChange: (value: boolean) => void;
  mediaPlayerShuffle: boolean;
  onMediaPlayerShuffleChange: (value: boolean) => void;
  mediaPlayerImageDuration: string;
  onMediaPlayerImageDurationChange: (value: string) => void;
  mediaPlayerShowControls: boolean;
  onMediaPlayerShowControlsChange: (value: boolean) => void;
  mediaPlayerFitMode: MediaFitMode;
  onMediaPlayerFitModeChange: (value: MediaFitMode) => void;
  mediaPlayerBgColor: string;
  onMediaPlayerBgColorChange: (value: string) => void;
  mediaPlayerTransition: boolean;
  onMediaPlayerTransitionChange: (value: boolean) => void;
  mediaPlayerTransitionDuration: string;
  onMediaPlayerTransitionDurationChange: (value: string) => void;
  mediaPlayerMute: boolean;
  onMediaPlayerMuteChange: (value: boolean) => void;
  onPickMediaFromDevice: (type: 'video' | 'image' | 'any') => void;
  pickingMedia: boolean;
  
  // HTTP Basic Auth (webview only)
  basicAuthUsername: string;
  onBasicAuthUsernameChange: (value: string) => void;
  basicAuthPassword: string;
  onBasicAuthPasswordChange: (value: string) => void;

  // Navigation
  onBackToKiosk: () => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  displayMode,
  onDisplayModeChange,
  url,
  onUrlChange,
  externalAppPackage,
  onExternalAppPackageChange,
  onPickApp,
  loadingApps,
  externalAppMode,
  onExternalAppModeChange,
  managedApps,
  onManagedAppsChange,
  hasOverlayPermission,
  onRequestOverlayPermission,
  hasUsageStatsPermission,
  onRequestUsageStatsPermission,
  isDeviceOwner,
  pin,
  onPinChange,
  isPinConfigured,
  pinModeChanged,
  pinMaxAttemptsText,
  onPinMaxAttemptsChange,
  onPinMaxAttemptsBlur,
  pinMode,
  onPinModeChange,
  dashboardModeEnabled,
  onDashboardModeEnabledChange,
  autoReload,
  onAutoReloadChange,
  pdfViewerEnabled,
  onPdfViewerEnabledChange,
  printEnabled,
  onPrintEnabledChange,
  printPaperSize,
  onPrintPaperSizeChange,
  urlRotationEnabled,
  onUrlRotationEnabledChange,
  urlRotationList,
  onUrlRotationListChange,
  urlRotationInterval,
  onUrlRotationIntervalChange,
  urlPlannerEnabled,
  onUrlPlannerEnabledChange,
  urlPlannerEvents,
  onUrlPlannerEventsChange,
  onAddRecurringEvent,
  onAddOneTimeEvent,
  onEditEvent,
  webViewBackButtonEnabled,
  onWebViewBackButtonEnabledChange,
  webViewBackButtonXPercent,
  onWebViewBackButtonXPercentChange,
  webViewBackButtonYPercent,
  onWebViewBackButtonYPercentChange,
  onResetWebViewBackButtonPosition,
  inactivityReturnEnabled,
  onInactivityReturnEnabledChange,
  inactivityReturnDelay,
  onInactivityReturnDelayChange,
  inactivityReturnResetOnNav,
  onInactivityReturnResetOnNavChange,
  inactivityReturnClearCache,
  onInactivityReturnClearCacheChange,
  inactivityReturnScrollTop,
  onInactivityReturnScrollTopChange,
  mediaPlayerItems,
  onMediaPlayerItemsChange,
  mediaPlayerAutoPlay,
  onMediaPlayerAutoPlayChange,
  mediaPlayerLoop,
  onMediaPlayerLoopChange,
  mediaPlayerShuffle,
  onMediaPlayerShuffleChange,
  mediaPlayerImageDuration,
  onMediaPlayerImageDurationChange,
  mediaPlayerShowControls,
  onMediaPlayerShowControlsChange,
  mediaPlayerFitMode,
  onMediaPlayerFitModeChange,
  mediaPlayerBgColor,
  onMediaPlayerBgColorChange,
  mediaPlayerTransition,
  onMediaPlayerTransitionChange,
  mediaPlayerTransitionDuration,
  onMediaPlayerTransitionDurationChange,
  mediaPlayerMute,
  onMediaPlayerMuteChange,
  onPickMediaFromDevice,
  pickingMedia,
  basicAuthUsername,
  onBasicAuthUsernameChange,
  basicAuthPassword,
  onBasicAuthPasswordChange,
  onBackToKiosk,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View>
      {/* Display Mode Selection */}
      <SettingsSection title={t('settings.general.sDisplayMode')} icon="cellphone">
        <SettingsModeSelector
          options={[
            { value: 'webview', label: t('settings.general.optWebsite'), icon: 'web' },
            { value: 'media_player', label: t('settings.general.optMedia'), icon: 'play-circle-outline' },
            { value: 'external_app', label: 'App', icon: 'android' },
          ]}
          value={displayMode}
          onValueChange={(value) => onDisplayModeChange(value as 'webview' | 'external_app' | 'media_player')}
          hint={t('settings.general.hDisplayMode')}
        />
        
        {/* Device Owner warning for External App */}
        {displayMode === 'external_app' && !isDeviceOwner && (
          <SettingsInfoBox variant="error" title={t('settings.general.sDeviceOwner')}>
            <Text style={styles.infoText}>
              Without Device Owner:{`
`}
              • Navigation buttons remain accessible{`
`}
              • User can exit the app freely{`
`}
              • Lock mode may not work properly
            </Text>
          </SettingsInfoBox>
        )}
      </SettingsSection>
      
      {/* How to Use */}
      <SettingsSection variant="info">
        <Text style={styles.infoTitle}>ℹ️ How to Use</Text>
        <Text style={styles.infoText}>
          {displayMode === 'media_player' 
            ? '• Add video or image URLs to build a playlist\n• Configure playback options (loop, shuffle, etc.)\n• Set a secure PIN code\n• Enable "Lock Mode" for full kiosk mode\n• Tap 5 times to access settings'
            : `• Configure the URL of the web page to display\n• Set a secure PIN code\n• Enable "Lock Mode" for full kiosk mode\n• Tap 5 times on the secret button to access settings (default: bottom-right)\n• Enter PIN code to unlock`}
        </Text>
      </SettingsSection>
      
      {/* ===== MEDIA PLAYER SETTINGS ===== */}
      {displayMode === 'media_player' && (
        <>
          {/* Media Items / Playlist */}
          <SettingsSection title={t('settings.general.sPlaylist')} icon="play-circle-outline">
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                {'🎬 Add media from your device or via URL.\n'}
                {'Supported: MP4, WebM, OGG (video) • JPG, PNG, GIF, WebP, SVG (image)\n\n'}
                {'📱 Local files are copied to app storage for reliable playback.'}
              </Text>
            </SettingsInfoBox>
            
            {/* Pick from device buttons */}
            <View style={styles.pickButtonsRow}>
              <TouchableOpacity
                style={[styles.pickButton, pickingMedia && styles.pickButtonDisabled]}
                onPress={() => !pickingMedia && onPickMediaFromDevice('any')}
                disabled={pickingMedia}
              >
                <Text style={styles.pickButtonText}>
                  {pickingMedia ? '⏳ Picking...' : '📁 Pick from Device'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickButtonSmall, { backgroundColor: Colors.info }, pickingMedia && styles.pickButtonDisabled]}
                onPress={() => !pickingMedia && onPickMediaFromDevice('video')}
                disabled={pickingMedia}
              >
                <Text style={styles.pickButtonSmallText}>🎥</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickButtonSmall, { backgroundColor: Colors.secondary }, pickingMedia && styles.pickButtonDisabled]}
                onPress={() => !pickingMedia && onPickMediaFromDevice('image')}
                disabled={pickingMedia}
              >
                <Text style={styles.pickButtonSmallText}>🖼️</Text>
              </TouchableOpacity>
            </View>
            
            {mediaPlayerItems.map((item, index) => (
              <View key={item.id} style={styles.mediaItemCard}>
                <View style={styles.mediaItemHeader}>
                  <Text style={styles.mediaItemIndex}>{index + 1}</Text>
                  <View style={[
                    styles.mediaItemTypeBadge,
                    { backgroundColor: item.type === 'video' ? Colors.info : Colors.secondary }
                  ]}>
                    <Text style={styles.mediaItemTypeText}>
                      {item.type === 'video' ? '🎥 Video' : '🖼️ Image'}
                    </Text>
                  </View>
                  {item.isLocal && (
                    <View style={styles.localBadge}>
                      <Text style={styles.localBadgeText}>📱 Local</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.mediaItemDeleteBtn}
                    onPress={() => {
                      const toDelete = mediaPlayerItems.find(i => i.id === item.id);
                      // If it's a local file, also delete the copied file
                      if (toDelete?.isLocal && toDelete.url.startsWith('file://')) {
                        FilePickerModule.deleteMediaFile(toDelete.url).catch(() => {});
                      }
                      const updated = mediaPlayerItems.filter(i => i.id !== item.id);
                      onMediaPlayerItemsChange(updated);
                    }}
                  >
                    <Text style={styles.mediaItemDeleteText}>✗</Text>
                  </TouchableOpacity>
                </View>
                
                {item.isLocal ? (
                  <View style={styles.localFileInfo}>
                    <Text style={styles.localFileName} numberOfLines={1}>
                      {getMediaDisplayName(item)}
                    </Text>
                    <Text style={styles.localFilePath} numberOfLines={1}>
                      {item.url}
                    </Text>
                  </View>
                ) : (
                  <SettingsInput
                    label="URL"
                    value={item.url}
                    onChangeText={(text) => {
                      const updated = mediaPlayerItems.map(i => 
                        i.id === item.id ? { ...i, url: text, type: detectMediaType(text) } : i
                      );
                      onMediaPlayerItemsChange(updated);
                    }}
                    placeholder="https://example.com/video.mp4"
                    keyboardType="url"
                  />
                )}
                
                {item.type === 'image' && (
                  <SettingsInput
                    label={t('settings.general.displayDuration')}
                    value={item.duration ? String(item.duration) : ''}
                    onChangeText={(text) => {
                      const dur = parseInt(text, 10);
                      const updated = mediaPlayerItems.map(i => 
                        i.id === item.id ? { ...i, duration: isNaN(dur) ? undefined : dur } : i
                      );
                      onMediaPlayerItemsChange(updated);
                    }}
                    placeholder={mediaPlayerImageDuration || '10'}
                    keyboardType="numeric"
                    hint={t('settings.general.hLeaveEmptyDuration')}
                  />
                )}
              </View>
            ))}
            
            <SettingsButton
              title={t('settings.general.bAddUrl')}
              icon="plus-circle"
              variant="success"
              onPress={() => {
                const newItem: MediaItem = {
                  id: generateMediaItemId(),
                  url: '',
                  type: 'video',
                  isLocal: false,
                };
                onMediaPlayerItemsChange([...mediaPlayerItems, newItem]);
              }}
            />
            
            {mediaPlayerItems.length === 0 && (
              <SettingsInfoBox variant="warning">
                <Text style={styles.infoText}>
                  {t('settings.general.infoNoMedia')}
                </Text>
              </SettingsInfoBox>
            )}
          </SettingsSection>
          
          {/* Playback Settings */}
          <SettingsSection title={t('settings.general.sPlayback')} icon="play">
            <SettingsSwitch
              label={t('settings.general.autoPlay')}
              value={mediaPlayerAutoPlay}
              onValueChange={onMediaPlayerAutoPlayChange}
              hint={t('settings.general.hAutoPlay')}
            />
            
            <SettingsSwitch
              label={t('settings.general.loopPlaylist')}
              value={mediaPlayerLoop}
              onValueChange={onMediaPlayerLoopChange}
              hint={t('settings.general.hLoop')}
            />
            
            <SettingsSwitch
              label={t('settings.general.shuffle')}
              value={mediaPlayerShuffle}
              onValueChange={onMediaPlayerShuffleChange}
              hint={t('settings.general.hShuffle')}
            />
            
            <SettingsSwitch
              label={t('settings.general.muteVideos')}
              value={mediaPlayerMute}
              onValueChange={onMediaPlayerMuteChange}
              hint={t('settings.general.hMute')}
            />
            
            <View style={styles.rotationSpacer} />
            <SettingsInput
              label={t('settings.general.defaultImageDuration')}
              value={mediaPlayerImageDuration}
              onChangeText={onMediaPlayerImageDurationChange}
              placeholder="10"
              keyboardType="numeric"
              hint={t('settings.general.hImgDuration')}
            />
          </SettingsSection>
          
          {/* Display Settings */}
          <SettingsSection title={t('settings.general.sDisplayOptions')} icon="monitor">
            <SettingsSwitch
              label={t('settings.general.showControls')}
              value={mediaPlayerShowControls}
              onValueChange={onMediaPlayerShowControlsChange}
              hint={t('settings.general.hControls')}
            />
            
            <View style={styles.rotationSpacer} />
            <SettingsRadioGroup
              label={t('settings.general.fitMode')}
              options={[
                { value: 'contain', label: t('settings.general.optContain') },
                { value: 'cover', label: t('settings.general.optCover') },
                { value: 'fill', label: t('settings.general.optFill') },
              ]}
              value={mediaPlayerFitMode}
              onValueChange={(v) => onMediaPlayerFitModeChange(v as MediaFitMode)}
            />
            
            <View style={styles.rotationSpacer} />
            <SettingsInput
              label={t('settings.general.bgColor')}
              value={mediaPlayerBgColor}
              onChangeText={onMediaPlayerBgColorChange}
              placeholder="#000000"
              hint={t('settings.general.hBgColor')}
            />
            
            <View style={styles.rotationSpacer} />
            <SettingsSwitch
              label={t('settings.general.crossfade')}
              value={mediaPlayerTransition}
              onValueChange={onMediaPlayerTransitionChange}
              hint={t('settings.general.hCrossfade')}
            />
            
            {mediaPlayerTransition && (
              <SettingsInput
                label={t('settings.general.transitionDuration')}
                value={mediaPlayerTransitionDuration}
                onChangeText={onMediaPlayerTransitionDurationChange}
                placeholder="500"
                keyboardType="numeric"
                hint={t('settings.general.hTransition')}
              />
            )}
          </SettingsSection>
        </>
      )}
      
      {/* URL Input (WebView mode) */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sUrlDisplay')} icon="link-variant">
          <SettingsSwitch
            label={t('settings.general.useDashboard')}
            value={dashboardModeEnabled}
            onValueChange={onDashboardModeEnabledChange}
            hint={t('settings.general.hDashboard')}
          />

          {dashboardModeEnabled ? (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                {t('settings.general.infoDashboardActive')}
              </Text>
            </SettingsInfoBox>
          ) : (
            <>
              <TouchableOpacity style={styles.pairButton} onPress={() => navigation.navigate('Pairing')}>
                <Text style={styles.pairButtonText}>Emparejar dispositivo con un código</Text>
              </TouchableOpacity>

              <SettingsInput
                label="Token del dispositivo (Somelier)"
                value={extractSomelierToken(url)}
                onChangeText={(token: string) => onUrlChange(buildSomelierUrl(token))}
                placeholder="Pegá acá el token del dispositivo"
                hint="Se obtiene al emparejar o al registrar el dispositivo en el portal. La URL completa se arma sola."
              />

              <SettingsInput
                label="URL completa (avanzado)"
                value={url}
                onChangeText={onUrlChange}
                placeholder="https://example.com"
                keyboardType="url"
                hint="Se completa sola con el token. Solo editá esto si sabés lo que hacés."
              />

              {url.trim().toLowerCase().startsWith('http://') && (
                <SettingsInfoBox variant="warning">
                  <Text style={styles.infoText}>
                    {t('settings.general.infoHttpWarning')}
                  </Text>
                </SettingsInfoBox>
              )}
            </>
          )}
        </SettingsSection>
      )}
      
      {/* HTTP Basic Auth (WebView mode only) */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sWebAuth')} icon="lock-outline">
          <SettingsInput
            label={t('settings.general.username')}
            value={basicAuthUsername}
            onChangeText={onBasicAuthUsernameChange}
            placeholder={t('settings.general.phLeaveEmpty')}
            hint={t('settings.general.hUsername')}
            autoCapitalize="none"
          />
          {basicAuthUsername.trim().length > 0 && (
            <SettingsInput
              label={t('settings.general.password')}
              value={basicAuthPassword}
              onChangeText={onBasicAuthPasswordChange}
              placeholder={t('settings.general.password')}
              secureTextEntry={true}
              hint={t('settings.general.hPassword')}
              autoCapitalize="none"
            />
          )}
          <SettingsInfoBox variant="info">
            <Text style={styles.infoText}>
              When a website returns a 401 Unauthorized response, FreeKiosk will automatically reply with these credentials. Leave username empty to disable.
            </Text>
          </SettingsInfoBox>
        </SettingsSection>
      )}

      {/* URL Rotation (WebView mode only) */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sUrlRotation')} icon="sync">
          {dashboardModeEnabled && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                URL Rotation is disabled in Dashboard mode.
              </Text>
            </SettingsInfoBox>
          )}
          {!dashboardModeEnabled && (
            <>
              <SettingsSwitch
                label={t('settings.general.enableRotation')}
                value={urlRotationEnabled}
                onValueChange={onUrlRotationEnabledChange}
                hint={t('settings.general.hRotation')}
              />

              {urlRotationEnabled && (
                <>
                  <View style={styles.rotationSpacer} />
                  <UrlListEditor
                    urls={urlRotationList}
                    onUrlsChange={onUrlRotationListChange}
                  />

                  <View style={styles.rotationSpacer} />
                  <SettingsInput
                    label={t('settings.general.rotationInterval')}
                    value={urlRotationInterval}
                    onChangeText={onUrlRotationIntervalChange}
                    placeholder="30"
                    keyboardType="numeric"
                    hint={t('settings.general.hRotationInterval')}
                  />

                  {urlRotationList.length < 2 && (
                    <SettingsInfoBox variant="warning">
                      <Text style={styles.infoText}>
                        {t('settings.general.infoNeed2Urls')}
                      </Text>
                    </SettingsInfoBox>
                  )}
                </>
              )}
            </>
          )}
        </SettingsSection>
      )}
      
      {/* URL Planner (WebView mode only) */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sUrlPlanner')} icon="calendar-clock">
          <SettingsSwitch
            label={t('settings.general.enableScheduled')}
            value={urlPlannerEnabled}
            onValueChange={onUrlPlannerEnabledChange}
            hint={t('settings.general.hScheduled')}
          />
          
          {urlPlannerEnabled && (
            <>
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  📌 Scheduled events take priority over URL Rotation.{`
`}
                  One-time events take priority over recurring events.
                </Text>
              </SettingsInfoBox>
              
              <View style={styles.rotationSpacer} />
              
              <ScheduleEventList
                events={urlPlannerEvents}
                onEventsChange={onUrlPlannerEventsChange}
                onAddRecurring={onAddRecurringEvent}
                onAddOneTime={onAddOneTimeEvent}
                onEditEvent={onEditEvent}
              />
            </>
          )}
        </SettingsSection>
      )}
      
      {/* External App Sub-Mode Selection */}
      {displayMode === 'external_app' && (
        <>
          <SettingsSection title={t('settings.general.sAppMode')} icon="apps">
            <SettingsModeSelector
              options={[
                { value: 'single', label: t('settings.general.optSingleApp'), icon: 'cellphone' },
                { value: 'multi', label: t('settings.general.optMultiApp'), icon: 'view-grid', badge: 'BETA', badgeColor: Colors.warning },
              ]}
              value={externalAppMode}
              onValueChange={(value) => onExternalAppModeChange(value as 'single' | 'multi')}
              hint={externalAppMode === 'single'
                ? 'Launch a single app in kiosk mode (classic behavior)'
                : 'Display a home screen grid with multiple apps'}
            />
          </SettingsSection>
          
          {/* Single App: classic package name + picker */}
          {externalAppMode === 'single' && (
            <SettingsSection title={t('settings.general.sApplication')} icon="cellphone-link">
              <SettingsInput
                label={t('settings.general.packageName')}
                value={externalAppPackage}
                onChangeText={onExternalAppPackageChange}
                placeholder="com.example.app"
                hint={t('settings.general.hPackage')}
              />
              
              <SettingsButton
                title={loadingApps ? 'Loading...' : 'Choose an Application'}
                icon="format-list-bulleted"
                variant="success"
                onPress={onPickApp}
                disabled={loadingApps}
                loading={loadingApps}
              />
            </SettingsSection>
          )}
          
          {/* Multi App: managed apps grid */}
          {externalAppMode === 'multi' && (
            <SettingsSection title={t('settings.general.sApplications')} icon="view-grid">
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  {'📱 Add apps to display on the home screen grid.\n'}
                  {'Users can choose which app to launch.\n\n'}
                  {'Toggle options per app: show on home screen, launch on boot, keep alive, accessibility.'}
                </Text>
              </SettingsInfoBox>
              <ManagedAppsSection
                managedApps={managedApps}
                onManagedAppsChange={onManagedAppsChange}
                isDeviceOwner={isDeviceOwner}
              />
            </SettingsSection>
          )}
          
          {/* Managed Apps for Single App mode (optional, for background/accessibility features) */}
          {externalAppMode === 'single' && (
            <SettingsSection title={t('settings.general.sManagedApps')} icon="apps">
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  {'📋 Optional: add extra apps for background monitoring, boot launch, or accessibility whitelist.\n'}
                  {'These apps will NOT appear on the home screen in single app mode.'}
                </Text>
              </SettingsInfoBox>
              <ManagedAppsSection
                managedApps={managedApps}
                onManagedAppsChange={onManagedAppsChange}
                isDeviceOwner={isDeviceOwner}
              />
            </SettingsSection>
          )}
          
          {/* Overlay Permission */}
          <SettingsSection
            variant={hasOverlayPermission ? 'success' : 'warning'}
          >
            <View style={styles.permissionRow}>
              <View style={styles.permissionTextContainer}>
                <Text style={[styles.permissionTitle, { color: hasOverlayPermission ? Colors.successDark : Colors.warningDark }]}>
                  {hasOverlayPermission ? '✓ Return Button Enabled' : '⚠️ Overlay Permission Required'}
                </Text>
                <Text style={styles.permissionHint}>
                  {hasOverlayPermission
                    ? "The return button will be functional on the external app."
                    : "Enable permission to use the return button on the app."}
                </Text>
              </View>
            </View>
            
            {!hasOverlayPermission && (
              <SettingsButton
                title={t('settings.general.bEnablePermission')}
                variant="success"
                onPress={onRequestOverlayPermission}
              />
            )}
          </SettingsSection>
          
          {/* Usage Stats Permission - required for auto-relaunch monitoring */}
          <SettingsSection
            variant={hasUsageStatsPermission ? 'success' : 'warning'}
          >
            <View style={styles.permissionRow}>
              <View style={styles.permissionTextContainer}>
                <Text style={[styles.permissionTitle, { color: hasUsageStatsPermission ? Colors.successDark : Colors.warningDark }]}>
                  {hasUsageStatsPermission ? '✓ Usage Access Granted' : '⚠️ Usage Access Required'}
                </Text>
                <Text style={styles.permissionHint}>
                  {hasUsageStatsPermission
                    ? "Auto-relaunch monitoring is active. FreeKiosk can detect when the external app closes."
                    : "Required for auto-relaunch. Without this, FreeKiosk cannot detect when the external app closes or crashes."}
                </Text>
              </View>
            </View>
            
            {!hasUsageStatsPermission && (
              <SettingsButton
                title={t('settings.general.bUsageAccess')}
                variant="warning"
                onPress={onRequestUsageStatsPermission}
              />
            )}
          </SettingsSection>
        </>
      )}
      
      {/* Password Configuration */}
      <SettingsSection title={t('settings.general.password')} icon="pin">
        <SettingsSwitch
          label={t('settings.general.advancedPassword')}
          hint={t('settings.general.hAdvancedPass')}
          value={pinMode === 'alphanumeric'}
          onValueChange={(enabled) => onPinModeChange(enabled ? 'alphanumeric' : 'numeric')}
        />
        
        <SettingsInput
          label=""
          value={pin}
          onChangeText={onPinChange}
          placeholder={isPinConfigured && !pinModeChanged ? '••••' : '1234'}
          keyboardType={pinMode === 'alphanumeric' ? 'default' : 'numeric'}
          secureTextEntry
          maxLength={pinMode === 'alphanumeric' ? undefined : 6}
          autoCapitalize={pinMode === 'alphanumeric' ? 'none' : undefined}
          error={pinModeChanged && !pin ? '⚠️ New password required after mode change' : undefined}
          hint={pinModeChanged
            ? '⚠️ Mode changed - You MUST enter a new password'
            : isPinConfigured
              ? '✓ Password configured - Leave empty to keep current password'
              : pinMode === 'alphanumeric'
                ? 'Minimum 4 characters. Can include letters, numbers, and special characters.'
                : 'Numeric PIN: 4-6 digits (default: 1234)'}
        />
        
        <View style={styles.pinAttemptsContainer}>
          <SettingsInput
            label={t('settings.general.maxAttempts')}
            value={pinMaxAttemptsText}
            onChangeText={onPinMaxAttemptsChange}
            onBlur={onPinMaxAttemptsBlur}
            keyboardType="numeric"
            maxLength={3}
            placeholder="5"
            hint={t('settings.general.hMaxAttempts')}
          />
        </View>
      </SettingsSection>
      
      {/* Inactivity Return to Home - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sInactivity')} icon="timer-sand">
          <SettingsSwitch
            label={t('settings.general.returnOnInactivity')}
            value={inactivityReturnEnabled}
            onValueChange={onInactivityReturnEnabledChange}
            hint={t('settings.general.hReturnInactivity')}
          />
          
          {inactivityReturnEnabled && (
            <>
              <View style={styles.rotationSpacer} />
              <SettingsInput
                label={t('settings.general.inactivityTimeout')}
                value={inactivityReturnDelay}
                onChangeText={onInactivityReturnDelayChange}
                placeholder="60"
                keyboardType="numeric"
                hint={t('settings.general.hInactivityTimeout')}
              />
              
              <View style={styles.rotationSpacer} />
              <SettingsSwitch
                label={t('settings.general.resetTimerOnLoad')}
                value={inactivityReturnResetOnNav}
                onValueChange={onInactivityReturnResetOnNavChange}
                hint={t('settings.general.hResetTimer')}
              />
              
              <SettingsSwitch
                label={t('settings.general.clearCacheOnReturn')}
                value={inactivityReturnClearCache}
                onValueChange={onInactivityReturnClearCacheChange}
                hint={t('settings.general.hClearCache')}
              />
              
              <SettingsSwitch
                label={t('settings.general.scrollTop')}
                value={inactivityReturnScrollTop}
                onValueChange={onInactivityReturnScrollTopChange}
                hint={t('settings.general.hScrollTop')}
              />
              
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  ℹ️ The timer resets on every touch interaction.{`\n`}
                  If already on the start page and scroll-to-top is enabled, the page will scroll up.{`\n`}
                  Disabled during URL Rotation, URL Planner, and Screensaver.
                </Text>
              </SettingsInfoBox>
            </>
          )}
        </SettingsSection>
      )}
      
      {/* Auto Reload - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sAutoReload')} icon="refresh">
          <SettingsSwitch
            label={t('settings.general.reloadOnError')}
            hint={t('settings.general.hReloadOnError')}
            value={autoReload}
            onValueChange={onAutoReloadChange}
          />
        </SettingsSection>
      )}
      
      {/* PDF Viewer - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sPdfViewer')} icon="file-pdf-box">
          <SettingsSwitch
            label={t('settings.general.inlinePdf')}
            hint={t('settings.general.hInlinePdf')}
            value={pdfViewerEnabled}
            onValueChange={onPdfViewerEnabledChange}
          />
          
          {pdfViewerEnabled && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                {'📄 PDF links will open in a built-in viewer with page navigation and zoom controls.\n\n'}
                {'⚠️ Enabling this feature allows file access in the WebView for the local PDF renderer. Only enable if your kiosk website links to PDF files.'}
              </Text>
            </SettingsInfoBox>
          )}
        </SettingsSection>
      )}
      
      {/* Printing - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sPrinting')} icon="printer">
          <SettingsSwitch
            label={t('settings.general.allowPrinting')}
            hint={t('settings.general.hPrinting')}
            value={printEnabled}
            onValueChange={onPrintEnabledChange}
          />
          
          {printEnabled && (
            <>
              <View style={styles.rotationSpacer} />
              <SettingsRadioGroup
                label={t('settings.general.paperSize')}
                options={[
                  { value: 'A4',     label: 'A4 (210 × 297 mm)' },
                  { value: 'A5',     label: 'A5 (148 × 210 mm)' },
                  { value: 'A3',     label: 'A3 (297 × 420 mm)' },
                  { value: 'LETTER', label: t('settings.general.optLetter') },
                  { value: 'LEGAL',  label: t('settings.general.optLegal') },
                ]}
                value={printPaperSize}
                onValueChange={onPrintPaperSizeChange}
              />
            </>
          )}

          {printEnabled && (
            <SettingsInfoBox variant="info">
              <Text style={styles.infoText}>
                {'🖨️ Web pages can trigger the Android print dialog via window.print().\n\n'}
                {'In Device Owner (kiosk) mode, the system print spooler is automatically whitelisted to allow the print dialog to appear.\n\n'}
                {'Supports WiFi, Bluetooth, USB printers, and Save as PDF.'}
              </Text>
            </SettingsInfoBox>
          )}
        </SettingsSection>
      )}
      
      {/* WebView Back Button - WebView only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sWebNav')} icon="arrow-left-circle">
          <SettingsSwitch
            label={t('settings.general.enableBackButton')}
            hint={t('settings.general.hBackButton')}
            value={webViewBackButtonEnabled}
            onValueChange={onWebViewBackButtonEnabledChange}
          />
          
          {webViewBackButtonEnabled && (
            <>
              <View style={styles.rotationSpacer} />
              <SettingsInfoBox variant="info">
                <Text style={styles.infoText}>
                  ℹ️ This button only navigates within the web page history.{`
`}
                  It will NOT exit the kiosk mode or return to settings.
                </Text>
              </SettingsInfoBox>
              
              <View style={styles.rotationSpacer} />
              <SettingsInput
                label={t('settings.general.posX')}
                value={webViewBackButtonXPercent}
                onChangeText={onWebViewBackButtonXPercentChange}
                placeholder="2"
                keyboardType="numeric"
                hint={t('settings.general.hPosX')}
              />
              
              <SettingsInput
                label={t('settings.general.posY')}
                value={webViewBackButtonYPercent}
                onChangeText={onWebViewBackButtonYPercentChange}
                placeholder="10"
                keyboardType="numeric"
                hint={t('settings.general.hPosY')}
              />
              
              <SettingsButton
                title={t('settings.general.bResetPos')}
                icon="restore"
                variant="outline"
                onPress={onResetWebViewBackButtonPosition}
              />
            </>
          )}
        </SettingsSection>
      )}
      
      {/* Background Apps - WebView mode only */}
      {displayMode === 'webview' && (
        <SettingsSection title={t('settings.general.sBgApps')} icon="apps">
          <SettingsInfoBox variant="info">
            <Text style={styles.infoText}>
              {'📋 Optional: add apps to launch and keep running in the background while the kiosk WebView is displayed.\n\n'}
              {'Example: keep a music or audio receiver app alive alongside your web dashboard.'}
            </Text>
          </SettingsInfoBox>
          <ManagedAppsSection
            managedApps={managedApps}
            onManagedAppsChange={onManagedAppsChange}
            isDeviceOwner={isDeviceOwner}
            showHomeScreenToggle={false}
          />
        </SettingsSection>
      )}

      {/* Back to Kiosk Button */}
      <SettingsButton
        title={t('settings.general.bBackToKiosk')}
        icon="arrow-u-left-top"
        variant="outline"
        onPress={onBackToKiosk}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pairButton: {
    backgroundColor: '#3b6fd4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  pairButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoText: {
    ...Typography.body,
    lineHeight: 22,
  },
  infoTitle: {
    ...Typography.label,
    color: Colors.infoDark,
    marginBottom: Spacing.sm,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    ...Typography.label,
    marginBottom: 4,
  },
  permissionHint: {
    ...Typography.hint,
  },
  pinAttemptsContainer: {
    marginTop: Spacing.lg,
  },
  rotationSpacer: {
    height: Spacing.md,
  },
  mediaItemCard: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mediaItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mediaItemIndex: {
    ...Typography.label,
    color: Colors.textSecondary,
    width: 24,
    textAlign: 'center',
    fontSize: 14,
  },
  mediaItemTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  mediaItemTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaItemDeleteBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaItemDeleteText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  pickButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonDisabled: {
    opacity: 0.5,
  },
  pickButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  pickButtonSmall: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonSmallText: {
    fontSize: 20,
  },
  localBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.successLight,
    marginLeft: 6,
  },
  localBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  localFileInfo: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  localFileName: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  localFilePath: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 11,
  },
});

export default GeneralTab;

import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Sticker Maker',
  slug: 'sticker-maker',
  scheme: 'stickermaker',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  android: {
    package: 'com.stickermaker.app',
    adaptiveIcon: { foregroundImage: './assets/android-icon-foreground.png', backgroundColor: '#ffffff' },
    permissions: ['android.permission.INTERNET'],
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  plugins: ['expo-router', ['expo-build-properties', { android: { minSdkVersion: 28 } }]],
  experiments: { typedRoutes: true },
};

export default config;

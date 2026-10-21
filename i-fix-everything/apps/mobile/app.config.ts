import type { ExpoConfig } from 'expo/config';

/**
 * Native identifiers are DEVELOPMENT PLACEHOLDERS until the owner supplies
 * final bundle/package ids and signing (docs/mobile-release.md). The variant
 * selects identifiers and the deep-link scheme so development, staging and
 * production builds can be installed side by side and never share callbacks.
 */
const variant = (process.env.APP_VARIANT ?? 'development') as 'development' | 'staging' | 'production';
const ids = {
  development: { suffix: '.dev', scheme: 'ifixeverything-dev', name: 'I Fix Everything (Dev)' },
  staging: { suffix: '.staging', scheme: 'ifixeverything-staging', name: 'I Fix Everything (Beta)' },
  production: { suffix: '', scheme: 'ifixeverything', name: 'I Fix Everything' },
}[variant];
const baseId = process.env.APP_BUNDLE_ID_BASE ?? 'dev.placeholder.ifixeverything';

const config: ExpoConfig = {
  name: ids.name,
  slug: 'i-fix-everything',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: ids.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: `${baseId}${ids.suffix}`,
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: 'Take photos of your machine so they can be added to your repair.',
      NSPhotoLibraryUsageDescription: 'Choose photos of your machine to add to your repair.',
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [],
    },
  },
  android: {
    package: `${baseId}${ids.suffix}`.replace(/-/g, '_'),
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#16191D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // Only the camera is requested; the system photo picker needs no media permission.
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.BLUETOOTH_CONNECT',
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'Choose photos of your machine to add to your repair.',
        cameraPermission: 'Take photos of your machine so they can be added to your repair.',
        microphonePermission: false,
      },
    ],
    ['expo-splash-screen', { backgroundColor: '#16191D', image: './assets/images/splash-icon.png', imageWidth: 76 }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    variant,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
  },
};

export default config;

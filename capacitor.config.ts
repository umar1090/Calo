import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutritrack.app',
  appName: 'NutriTrack',
  webDir: 'dist',
  android: {
    // The app only loads its own bundled files.
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Injects --safe-area-inset-* CSS variables so the layout clears the status and gesture bars.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // Dark icons on the light cream background.
      style: 'LIGHT',
    },
  },
};

export default config;

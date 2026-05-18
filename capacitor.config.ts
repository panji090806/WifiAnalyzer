import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ji.wifianalyzer',
  appName: 'WifiAnalyzer',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: ['dartd.my.id']
  }
};

export default config;

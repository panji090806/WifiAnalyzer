import { registerPlugin } from '@capacitor/core';

export interface WifiScanNetwork {
  SSID: string;
  BSSID: string;
  level: number;
  [key: string]: any;
}

export interface WifiScanResult {
  networks: WifiScanNetwork[];
}

export const CapacitorWifi = registerPlugin('CapacitorWifi', {
  web: () => import('./capacitor-wifi-web'),
}) as {
  getScanResults(): Promise<WifiScanResult>;
};

import type { WifiScanResult } from './capacitor-wifi';

export class CapacitorWifiWeb {
  async getScanResults(): Promise<WifiScanResult> {
    console.warn('CapacitorWifi plugin is not available on web. Returning empty scan results.');
    return { networks: [] };
  }
}

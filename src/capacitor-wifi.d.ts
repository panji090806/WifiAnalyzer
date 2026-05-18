declare module 'capacitor-wifi' {
  export interface WifiScanNetwork {
    SSID: string;
    BSSID: string;
    level: number;
    [key: string]: any;
  }

  export interface WifiScanResult {
    networks: WifiScanNetwork[];
  }

  export const CapacitorWifi: {
    getScanResults(): Promise<WifiScanResult>;
  };
}

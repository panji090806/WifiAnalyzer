export interface WifiNetwork {
  ssid: string;        // Nama WiFi
  bssid: string;       // MAC Address
  level: number;       // Kekuatan sinyal (dBm)
  frequency: number;   // Frekuensi (untuk Channel Graph)
  capabilities: string; // Keamanan (untuk Security Audit)
  timestamp: number;   // Waktu scan (untuk Signal Time-Graph)
}
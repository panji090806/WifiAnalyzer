import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { Geolocation } from '@capacitor/geolocation';
import { CapacitorWifi } from 'capacitor-wifi';
import { WifiNetwork } from '../models/wifi.interface';

// Import SQLite untuk penyimpanan lokal di HP
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineCanvas') private lineCanvas!: ElementRef;
  @ViewChild('barCanvas') private barCanvas!: ElementRef;
  
  lineChart: any;
  barChart: any;

  public networks: any[] = [];
  securityStats = { safe: 0, warning: 0, danger: 0 };
  selectedNetwork: WifiNetwork | null = null;
  isScanning = false;
  totalWifi: number = 0;
  public lastScanTime: string = ''; 
  public errorMessage: string = ''; 
  
  private updateInterval: any;
  
  // Variabel Database Lokal
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;

  // Constructor dibiarkan bersih tanpa initDatabase
  constructor(private alertController: AlertController) { }

  // --- LOGIKA DATABASE LOKAL (SQLITE) ---

  async initDatabase() {
    try {
      // Membuat koneksi ke database bernama 'wifi_db'
      this.db = await this.sqlite.createConnection('wifi_db', false, 'no-encryption', 1, false);
      await this.db.open();
      
      // Membuat tabel jika belum ada
      const schema = `CREATE TABLE IF NOT EXISTS wifi_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ssid TEXT,
        level TEXT,
        capabilities TEXT,
        waktu TEXT
      );`;
      await this.db.execute(schema);
      console.log('SQLITE READY: Database Lokal berhasil disiapkan.');
    } catch (e) {
      console.error('SQLITE ERROR: Gagal menyiapkan database', e);
      this.errorMessage = 'Gagal memuat Database Lokal.';
    }
  }

  async saveToLocalDB(payload: any) {
    try {
      // Simpan setiap hasil scan ke dalam tabel lokal di HP
      for (const wifi of payload.daftarWifi) {
        const query = `INSERT INTO wifi_data (ssid, level, capabilities, waktu) VALUES (?, ?, ?, ?)`;
        await this.db.run(query, [wifi.ssid, wifi.level, wifi.capabilities, payload.waktu]);
      }
      this.errorMessage = "BERHASIL: " + payload.daftarWifi.length + " data tersimpan di HP.";
      console.log('SQLITE SUCCESS: Data wifi berhasil disimpan ke HP.');
    } catch (e) {
      console.error('SQLITE SAVE ERROR:', e);
      this.errorMessage = 'Gagal menyimpan ke Database Lokal.';
    }
  }

  // --- LOGIKA SIKLUS HIDUP APLIKASI ---

  async ngOnInit() {
    // Jalankan initDatabase di sini agar platform benar-benar siap
    await this.initDatabase();
    
    this.checkPermissions();
    this.networks = [];
    
    // Update grafik setiap 3 detik
    this.updateInterval = setInterval(() => {
      if (!this.isScanning) {
        this.updateChannelData();
        this.updateSecurityStats(); 
      }
      this.updateLiveGraph();
    }, 3000);
  }

  ngAfterViewInit() {
    this.createLineChart();
    this.createBarChart();
    this.checkPermissions();
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  // --- LOGIKA SCAN WIFI ---

  async startScan() {
    console.log('--- MEMULAI SCAN WIFI ---');
    if (this.isScanning) return; // Mencegah scan ganda jika tombol diklik cepat

    this.isScanning = true;
    this.errorMessage = 'Memindai jaringan...';

    try {
      await this.checkPermissions();
      const result = await CapacitorWifi.getScanResults();
      const scanData = (result as any)?.networks || (result as any)?.scan || [];

      if (scanData && scanData.length > 0) {
        this.networks = [...scanData].sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
        this.totalWifi = this.networks.length;
        this.lastScanTime = new Date().toLocaleTimeString();

        this.updateChannelData();
        this.updateSecurityStats();
        this.updateLiveGraph();

        // Siapkan data untuk disimpan ke SQLite
        const payload = {
          waktu: new Date().toLocaleString(),
          daftarWifi: this.networks.map(wifi => ({
            ssid: wifi.SSID || wifi.ssid || 'Hidden Network',
            level: wifi.level ? wifi.level.toString() : '0',
            capabilities: wifi.capabilities || wifi.security || 'Open'
          }))
        };

        // SIMPAN KE DATABASE HP (SQLite)
        await this.saveToLocalDB(payload);
        
      } else {
        this.errorMessage = 'Tidak ada jaringan ditemukan.';
      }
    } catch (error) {
      console.error('SCAN ERROR:', error);
      this.errorMessage = 'Gagal memindai. Cek GPS/Izin Lokasi!';
    } finally {
      this.isScanning = false;
    }
  }

  // --- LOGIKA IZIN & GRAFIK ---

  async checkPermissions() {
    try {
      const status = await Geolocation.requestPermissions();
      if (status.location !== 'granted') {
        const alert = await this.alertController.create({
          header: 'Izin Lokasi',
          message: 'Izin lokasi wajib aktif untuk memindai WiFi.',
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (e) {
      console.error("Gagal meminta izin", e);
    }
  }

  createLineChart() {
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ['10s', '8s', '6s', '4s', '2s', 'Now'],
        datasets: [{
          label: 'Sinyal (dBm)',
          data: [-100, -100, -100, -100, -100, -100],
          borderColor: '#3880ff',
          backgroundColor: 'rgba(56, 128, 255, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: -100, max: -20 } },
        animation: { duration: 0 }
      }
    });
  }

  createBarChart() {
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['1','2','3','4','5','6','7','8','9','10','11','12','13'],
        datasets: [{
          label: 'Kepadatan Channel',
          data: new Array(13).fill(0),
          backgroundColor: '#3880ff'
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  updateChannelData() {
    const channelCounts = new Array(13).fill(0);
    this.networks.forEach(wifi => {
      const freq = wifi.frequency;
      let ch = 0;
      if (freq >= 2412 && freq <= 2484) ch = (freq - 2407) / 5;
      if (ch >= 1 && ch <= 13) channelCounts[ch - 1]++;
    });

    if (this.barChart) {
      this.barChart.data.datasets[0].data = channelCounts;
      this.barChart.update();
    }
  }

  updateLiveGraph() {
    if (this.lineChart && this.networks.length > 0) {
      const currentLevel = this.networks[0].level;
      this.lineChart.data.datasets[0].data.shift();
      this.lineChart.data.datasets[0].data.push(currentLevel);
      this.lineChart.update();
    }
  }

  updateSecurityStats() {
    this.securityStats = { safe: 0, warning: 0, danger: 0 };
    this.networks.forEach(wifi => {
      const cap = wifi.capabilities || "";
      if (cap.includes('WPA3') || cap.includes('WPA2')) this.securityStats.safe++;
      else if (cap.includes('WPA') || cap.includes('WEP')) this.securityStats.warning++;
      else this.securityStats.danger++;
    });
  }

  getTrackerColor(level?: number): string {
    if (level === undefined || level === null) return 'medium';
    if (level > -50) return 'success'; 
    if (level > -70) return 'warning'; 
    return 'danger'; 
  }

  getSignalStatus(): string {
    if (!this.networks || this.networks.length === 0) return 'Menunggu Scan...';
    const level = this.networks[0].level;
    if (level > -50) return 'Sangat Dekat 🔥';
    if (level > -70) return 'Sinyal Cukup 📍';
    return 'Sinyal Lemah ❌';
  }

  getChannelFromFreq(freq: number): number {
    if (freq >= 2412 && freq <= 2484) {
      return (freq - 2407) / 5;
    } else if (freq >= 5170 && freq <= 5825) {
      return (freq - 5000) / 5;
    }
    return 0;
  }
}
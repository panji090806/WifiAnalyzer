import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { Geolocation } from '@capacitor/geolocation';
import { CapacitorWifi } from 'capacitor-wifi';
import { WifiNetwork } from '../models/wifi.interface';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DatabaseService } from '../services/database.service';
import { Subscription } from 'rxjs'; 

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
  private dbSub!: Subscription; 
  
  private db!: SQLiteDBConnection;
  private isDbReady = false; 

  constructor(
    private alertController: AlertController,
    private databaseService: DatabaseService
  ) { }

  // --- LOGIKA DATABASE LOKAL (SQLITE) ---

  async initDatabase() {
    try {
      // Cukup ambil instance database yang sudah siap dari Service
      this.db = this.databaseService.getDatabase();
      
      this.isDbReady = true;
      this.errorMessage = 'Database Siap.';
      console.log('Koneksi database pusat berhasil dihubungkan ke halaman Home.');
    } catch (e) {
      console.error('SQLITE ERROR PADA ALUR INIT HOME PAGE:', e);
      this.isDbReady = false;
      this.errorMessage = 'Gagal memuat Database Lokal.';
    }
  }

  async saveToLocalDB(payload: any) {
    if (!this.isDbReady || !this.db) {
      this.errorMessage = 'Gagal menyimpan: Database belum siap.';
      return;
    }

    try {
      // Sesuaikan parameter INSERT dengan struktur tabel wifi_data yang ada di DatabaseService
      for (const wifi of payload.daftarWifi) {
        const query = `INSERT INTO wifi_data (ssid, bssid, signal_strength, security, status) VALUES (?, ?, ?, ?, ?)`;
        await this.db.run(query, [
          wifi.ssid, 
          wifi.bssid, 
          parseInt(wifi.level), 
          wifi.capabilities, 
          'Scanned'
        ]);
      }
      this.errorMessage = "BERHASIL: " + payload.daftarWifi.length + " data tersimpan.";
      console.log('Log Berhasil: Data scan WiFi tersimpan ke SQLite.');
    } catch (e) {
      console.error('SQLITE SAVE ERROR:', e);
      this.errorMessage = 'Gagal menyimpan ke Database.';
    }
  }

  // --- SIKLUS HIDUP APLIKASI ---

  async ngOnInit() {
    // 1. Mengamati status kesiapan database secara real-time
    this.dbSub = this.databaseService.isDbReady.subscribe(async (ready) => {
      console.log('Status Kesiapan Database Utama:', ready);
      if (ready) {
        await this.initDatabase();
      } else {
        this.isDbReady = false;
        this.errorMessage = 'Menunggu database diinisialisasi...';
      }
    });

    // 2. Jalankan pengecekan izin lokasi/wifi
    await this.checkPermissions();
    this.networks = [];
    
    // 3. Jalankan pemindaian otomatis pertama kali setelah komponen siap
    setTimeout(() => {
      this.startScan();
    }, 1000);

    // 4. Jalankan interval pembaruan grafik rutin
    this.updateInterval = setInterval(() => {
      if (!this.isScanning) {
        this.updateLiveGraph();
      }
    }, 3000);
  }

  ngAfterViewInit() {
    this.createLineChart();
    this.createBarChart();
  }

  ngOnDestroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.dbSub) this.dbSub.unsubscribe();
  }

  // --- LOGIKA SCAN WIFI & GRAFIK ---

  async startScan() {
    if (this.isScanning) return; 
    this.isScanning = true;
    this.errorMessage = 'Memindai jaringan...';

    try {
      const result = await CapacitorWifi.getScanResults();
      const scanData = (result as any)?.networks || (result as any)?.scan || [];

      if (scanData && scanData.length > 0) {
        this.networks = [...scanData].sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
        this.totalWifi = this.networks.length;
        this.lastScanTime = new Date().toLocaleTimeString();

        this.updateChannelData();
        this.updateSecurityStats();
        this.updateLiveGraph();

        // Menyusun payload data yang sesuai dengan struktur kolom database terpusat
        const payload = {
          waktu: new Date().toLocaleString(),
          daftarWifi: this.networks.map(wifi => ({
            ssid: wifi.SSID || wifi.ssid || 'Hidden Network',
            bssid: wifi.BSSID || wifi.bssid || '00:00:00:00:00:00',
            level: wifi.level ? wifi.level.toString() : '0',
            capabilities: wifi.capabilities || wifi.security || 'Open'
          }))
        };
        
        await this.saveToLocalDB(payload);
      } else {
        this.errorMessage = 'Tidak ada jaringan ditemukan.';
      }
    } catch (error) {
      this.errorMessage = 'Gagal memindai. Cek GPS!';
      console.error(error);
    } finally {
      this.isScanning = false;
    }
  }

  async checkPermissions() {
    try {
      const status = await Geolocation.requestPermissions();
      if (status.location !== 'granted') {
        const alert = await this.alertController.create({
          header: 'Izin Lokasi',
          message: 'Izin lokasi wajib aktif.',
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (e) {}
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
    if (freq >= 2412 && freq <= 2484) return (freq - 2407) / 5;
    if (freq >= 5170 && freq <= 5825) return (freq - 5000) / 5;
    return 0;
  }
}
import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  
  // BehaviorSubject untuk memberi tahu halaman lain apakah DB sudah siap digunakan
  public isDbReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {}

  /**
   * 1. INSIALISASI PLUGIN & KONEKSI DATABASE
   * Fungsi ini dipanggil sekali di awal aplikasi lewat app.component.ts
   */
  async initializePlugin() {
    try {
      // Periksa konsistensi koneksi database yang ada
      const cc = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection('wifi_db', false)).result;

      // Jika koneksi sudah ada, gunakan kembali. Jika belum, buat koneksi baru.
      if (cc.result && isConn) {
        this.db = await this.sqlite.retrieveConnection('wifi_db', false);
      } else {
        this.db = await this.sqlite.createConnection('wifi_db', false, 'no-encryption', 1, false);
      }

      // Buka database dan buat tabel jika belum ada
      await this.db.open();
      await this.createTable();
      
      // Beritahu seluruh aplikasi (Subscribers) bahwa DB sudah siap digunakan
      this.isDbReady.next(true); 
      console.log('Database SQLite berhasil disiapkan.');
    } catch (error) {
      console.error('Gagal inisialisasi database:', error);
      this.isDbReady.next(false); // Set ke false jika terjadi error
    }
  }

  /**
   * 2. MEMBUAT TABEL SKEMA
   * Membuat tabel wifi_data jika belum ada di dalam file database
   */
  async createTable() {
    const schema = `
      CREATE TABLE IF NOT EXISTS wifi_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ssid TEXT,
        bssid TEXT,
        signal_strength INTEGER,
        security TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.db.execute(schema);
  }

  /**
   * 3. FUNGSI UNTUK MENYIMPAN DATA (CREATE)
   * Menyimpan data hasil scanning WiFi ke dalam database lokal
   */
  async saveWifiData(ssid: string, bssid: string, signalStrength: number, security: string, status: string) {
    try {
      if (!this.db) {
        throw new Error('Koneksi database belum siap atau belum terbuka.');
      }

      const query = `
        INSERT INTO wifi_data (ssid, bssid, signal_strength, security, status) 
        VALUES (?, ?, ?, ?, ?);
      `;
      
      // Menggunakan db.run dengan parameter array [] untuk keamanan data (menghindari SQL Injection)
      const result = await this.db.run(query, [ssid, bssid, signalStrength, security, status]);
      console.log('Data WiFi berhasil disimpan ke SQLite:', result);
      return result;
    } catch (error) {
      console.error('Gagal menyimpan data WiFi ke database:', error);
      throw error;
    }
  }

  /**
   * 4. FUNGSI UNTUK MENGAMBIL SEMUA DATA (READ)
   * Mengambil riwayat scan WiFi diurutkan dari yang paling baru
   */
  async getAllWifiData() {
    try {
      if (!this.db) {
        console.warn('Database belum siap saat mencoba mengambil data.');
        return [];
      }
      
      const query = `SELECT * FROM wifi_data ORDER BY timestamp DESC;`;
      const res = await this.db.query(query);
      
      // Mengembalikan array values jika ada data, jika kosong kembalikan array kosong []
      return res.values ? res.values : [];
    } catch (error) {
      console.error('Gagal mengambil data dari SQLite:', error);
      return [];
    }
  }

  /**
   * 5. FUNGSI UNTUK MENGHAPUS SEMUA DATA (DELETE - OPTIONAL)
   * Berguna jika user ingin membersihkan log riwayat scan WiFi mereka
   */
  async clearAllWifiData() {
    try {
      if (!this.db) throw new Error('Database belum siap.');
      const query = `DELETE FROM wifi_data;`;
      await this.db.execute(query);
      console.log('Semua riwayat WiFi berhasil dihapus.');
    } catch (error) {
      console.error('Gagal menghapus riwayat WiFi:', error);
      throw error;
    }
  }

  /**
   * Getter untuk mengambil object database mentah jika diperlukan di tempat lain
   */
  getDatabase() {
    return this.db;
  }
}
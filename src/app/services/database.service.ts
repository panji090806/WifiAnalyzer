import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService { // Nama class diubah menjadi DatabaseService agar sesuai import
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  public isDbReady: boolean = false;

  constructor() {}

  async initializePlugin() {
    try {
      const cc = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection('wifi_db', false)).result;

      if (cc.result && isConn) {
        this.db = await this.sqlite.retrieveConnection('wifi_db', false);
      } else {
        this.db = await this.sqlite.createConnection('wifi_db', false, 'no-encryption', 1, false);
      }

      await this.db.open();
      await this.createTable();
      
      this.isDbReady = true;
      console.log('Database SQLite berhasil disiapkan.');
    } catch (error) {
      console.error('Gagal inisialisasi database:', error);
    }
  }

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

  getDatabase() {
    return this.db;
  }
}
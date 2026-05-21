import { Component } from '@angular/core';
import { App } from '@capacitor/app'; // Pastikan plugin ini terinstall
import { AlertController, Platform } from '@ionic/angular';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private alertController: AlertController,
    private databaseService: DatabaseService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(async() => {
      try {
        await this.databaseService.initializePlugin();
        console.log('Database SQLite berhasil disiapkan di awal aplikasi.');
      } catch (error) {
        console.error('Gagal menyiapkan database di awal aplikasi:', error);
      }
      
      // Menangani tombol back fisik di Android
      App.addListener('backButton', async () => {
        const alert = await this.alertController.create({
          header: 'Konfirmasi',
          message: 'Apakah Anda ingin keluar dari WifiAnalyzer?',
          buttons: [
            {
              text: 'Tidak',
              role: 'cancel'
            },
            {
              text: 'Ya',
              handler: () => {
                App.exitApp(); // Keluar dari aplikasi
              }
            }
          ]
        });
        await alert.present();
      });
    });
  }
}
package com.ji.wifianalyzer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.app.AlertDialog;

// 1. IMPORT PLUGIN WIFI DAN SQLITE YANG BENAR
import com.digaus.capwifi.Wifi;
import com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // 2. DAFTARKAN KEDUA PLUGIN DI SINI
    registerPlugin(Wifi.class);
    registerPlugin(CapacitorSQLitePlugin.class); 
  }
}

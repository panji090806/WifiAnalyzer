package com.ji.wifianalyzer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// Import yang benar sesuai dengan isi file Wifi.java di VS Code kamu
import com.digaus.capwifi.Wifi;
import android.app.AlertDialog;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      // Daftarkan plugin dengan nama class yang benar: Wifi
      registerPlugin(com.digaus.capwifi.Wifi.class);
    }
}

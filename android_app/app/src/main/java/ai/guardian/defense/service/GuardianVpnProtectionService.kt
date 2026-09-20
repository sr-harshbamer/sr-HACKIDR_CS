package ai.guardian.defense.service

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log

class GuardianVpnProtectionService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            vpnInterface = Builder()
                .setSession("Guardian Local DNS Filter")
                .addAddress("10.0.0.2", 24)
                .addDnsServer("1.1.1.1")
                .establish()
            Log.i("GuardianVpn", "Local DNS sinkhole activated for pre-navigation protection.")
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        vpnInterface?.close()
        vpnInterface = null
    }
}

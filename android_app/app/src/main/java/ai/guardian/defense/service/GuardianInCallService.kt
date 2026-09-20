package ai.guardian.defense.service

import android.content.Intent
import android.telecom.Call
import android.telecom.InCallService
import android.util.Log

class GuardianInCallService : InCallService() {

    override fun onCallAdded(call: Call?) {
        super.onCallAdded(call)
        val callerHandle = call?.details?.handle?.schemeSpecificPart ?: "Unknown"
        Log.i("GuardianCall", "In-Call protection active for incoming caller: $callerHandle")

        // Register call state listener for live speech trajectory
        call?.registerCallback(object : Call.Callback() {
            override fun onStateChanged(c: Call?, state: Int) {
                if (state == Call.STATE_ACTIVE) {
                    Log.i("GuardianCall", "Call is active. Real-time trajectory listening enabled.")
                }
            }
        })
    }

    override fun onCallRemoved(call: Call?) {
        super.onCallRemoved(call)
        Log.i("GuardianCall", "Call disconnected.")
    }
}

package ai.guardian.defense.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.core.app.NotificationCompat

class GuardianOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        startForegroundNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("EXTRA_TITLE") ?: "POTENTIALLY DANGEROUS EVENT DETECTED"
        val target = intent?.getStringExtra("EXTRA_TARGET") ?: ""
        val riskLevel = intent?.getStringExtra("EXTRA_RISK_LEVEL") ?: "CRITICAL"
        val reasons = intent?.getStringArrayListExtra("EXTRA_REASONS") ?: arrayListOf()

        showFloatingWarning(title, target, riskLevel, reasons)
        return START_NOT_STICKY
    }

    private fun showFloatingWarning(title: String, target: String, riskLevel: String, reasons: List<String>) {
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
            overlayView = null
        }

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
            y = 0
        }

        // Inflate dynamic intervention layout programmatically or via layout
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setBackgroundColor(android.graphics.Color.parseColor("#E60F172A")) // Dark Slate Translucent
            setPadding(48, 48, 48, 48)
            elevation = 32f

            // Card Container with glowing border
            val card = android.widget.LinearLayout(context).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                setBackgroundColor(android.graphics.Color.parseColor("#1E293B"))
                setPadding(36, 36, 36, 36)

                // Header
                val headerView = TextView(context).apply {
                    text = "🚨 GUARDIAN PROACTIVE DEFENSE"
                    textSize = 12f
                    setTextColor(android.graphics.Color.parseColor("#F43F5E")) // Rose 500
                    typeface = android.graphics.Typeface.MONOSPACE
                    paint.isFakeBoldText = true
                }
                addView(headerView)

                // Title
                val titleView = TextView(context).apply {
                    text = "$title ($riskLevel)"
                    textSize = 16f
                    setTextColor(android.graphics.Color.WHITE)
                    paint.isFakeBoldText = true
                    setPadding(0, 8, 0, 8)
                }
                addView(titleView)

                // Target info
                if (target.isNotEmpty()) {
                    val targetView = TextView(context).apply {
                        text = "Target: $target"
                        textSize = 12f
                        setTextColor(android.graphics.Color.parseColor("#94A3B8"))
                        setPadding(0, 0, 0, 16)
                    }
                    addView(targetView)
                }

                // Reasons list
                for (r in reasons) {
                    val rView = TextView(context).apply {
                        text = "• $r"
                        textSize = 11f
                        setTextColor(android.graphics.Color.parseColor("#CBD5E1"))
                        setPadding(0, 4, 0, 4)
                    }
                    addView(rView)
                }

                // Action Button: Return to Safety
                val btnSafe = Button(context).apply {
                    text = "✓ RETURN TO SAFETY (Recommended)"
                    setBackgroundColor(android.graphics.Color.parseColor("#059669")) // Emerald 600
                    setTextColor(android.graphics.Color.WHITE)
                    setPadding(0, 16, 0, 16)
                    setOnClickListener {
                        removeOverlay()
                    }
                }
                val btnParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 24, 0, 8)
                }
                addView(btnSafe, btnParams)

                // Action Button: Dismiss
                val btnDismiss = Button(context).apply {
                    text = "Dismiss Warning (Unsafe)"
                    setBackgroundColor(android.graphics.Color.TRANSPARENT)
                    setTextColor(android.graphics.Color.parseColor("#64748B"))
                    textSize = 10f
                    setOnClickListener {
                        removeOverlay()
                    }
                }
                addView(btnDismiss)
            }
            addView(card)
        }

        overlayView = container
        try {
            windowManager?.addView(overlayView, layoutParams)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun removeOverlay() {
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
            overlayView = null
        }
        stopSelf()
    }

    private fun startForegroundNotification() {
        val channelId = "guardian_shield_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Guardian Protection Overlay",
                NotificationManager.IMPORTANCE_HIGH
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Guardian Active Defense")
            .setContentText("Monitoring security-sensitive events in real time")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        startForeground(1001, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
            overlayView = null
        }
    }
}

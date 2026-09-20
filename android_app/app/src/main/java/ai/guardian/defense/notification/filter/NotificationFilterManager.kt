package ai.guardian.defense.notification.filter

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class FilterMode {
    ALL_APPS,
    SELECTED_APPS
}

/**
 * Manages package-level filtering preferences for the Notification Listener.
 * Implements privacy-conscious filtering so unwanted apps are dropped before heavy triage.
 */
class NotificationFilterManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "guardian_notification_filters"
        private const val KEY_FILTER_MODE = "filter_mode"
        private const val KEY_SELECTED_PACKAGES = "selected_packages"
        private const val SELF_PACKAGE = "ai.guardian.defense"

        // Common communication and finance apps useful as defaults in SELECTED_APPS mode
        val DEFAULT_MONITORED_PACKAGES = setOf(
            "com.google.android.apps.messaging",
            "com.whatsapp",
            "org.telegram.messenger",
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",
            "net.one97.paytm"
        )
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _filterMode = MutableStateFlow(loadFilterMode())
    val filterMode: StateFlow<FilterMode> = _filterMode.asStateFlow()

    private val _selectedPackages = MutableStateFlow(loadSelectedPackages())
    val selectedPackages: StateFlow<Set<String>> = _selectedPackages.asStateFlow()

    /**
     * Fast check whether a notification from this package should be processed.
     * Evaluated before any parsing or risk engine work.
     */
    fun shouldProcess(packageName: String): Boolean {
        // Always drop Guardian's own notifications to prevent recursive loops
        if (packageName == SELF_PACKAGE || packageName.isBlank()) {
            return false
        }

        return when (_filterMode.value) {
            FilterMode.ALL_APPS -> true
            FilterMode.SELECTED_APPS -> _selectedPackages.value.contains(packageName)
        }
    }

    fun setFilterMode(mode: FilterMode) {
        prefs.edit().putString(KEY_FILTER_MODE, mode.name).apply()
        _filterMode.value = mode
    }

    fun setSelectedPackages(packages: Set<String>) {
        prefs.edit().putStringSet(KEY_SELECTED_PACKAGES, packages).apply()
        _selectedPackages.value = packages
    }

    fun addPackage(packageName: String) {
        val updated = _selectedPackages.value + packageName
        setSelectedPackages(updated)
    }

    fun removePackage(packageName: String) {
        val updated = _selectedPackages.value - packageName
        setSelectedPackages(updated)
    }

    private fun loadFilterMode(): FilterMode {
        val modeStr = prefs.getString(KEY_FILTER_MODE, FilterMode.ALL_APPS.name) ?: FilterMode.ALL_APPS.name
        return try {
            FilterMode.valueOf(modeStr)
        } catch (e: Exception) {
            FilterMode.ALL_APPS
        }
    }

    private fun loadSelectedPackages(): Set<String> {
        return prefs.getStringSet(KEY_SELECTED_PACKAGES, DEFAULT_MONITORED_PACKAGES)?.toSet()
            ?: DEFAULT_MONITORED_PACKAGES
    }
}

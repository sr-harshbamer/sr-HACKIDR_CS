# Android Real-Time Notification Listener Integration Guide

Guardian AI integrates a production-quality Android `NotificationListenerService` subsystem to inspect and triage incoming push alerts, SMS messages, and bank OTP notifications in real time to prevent social engineering, credential harvesting, and urgent payment coercion.

---

## 1. What NotificationListenerService Does
The `NotificationListenerService` is a specialized Android framework service that allows registered security tools to receive system-level callbacks whenever an application posts, updates, or dismisses a `StatusBarNotification`.

In Guardian AI:
- It acts as an autonomous on-device sensor.
- It parses incoming notifications into structured `NotificationEvent` records.
- It evaluates messages using `LocalRiskEngine` within milliseconds to detect OTP demands, reverse debit payment requests, and typosquatted phishing links.

---

## 2. Why Notification Access is Required
Android enforces strict user privacy boundaries for notifications. Notifications frequently contain sensitive OTPs, private chats, or personal information.

- **System Permission:** Declared in `AndroidManifest.xml` with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- **User Authorization:** Cannot be requested via standard runtime dialogs (`requestPermissions`). The user must explicitly grant access in Android System Settings (`Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`).
- **Guardian Enforcement:** The app detects whether access is enabled using `NotificationAccessManager` and provides direct deep links to the exact Settings page.

---

## 3. How the Service Receives Events

```
               Android Notification Subsystem
                             │
                             ▼
         [ GuardianNotificationListenerService ]
                             │
        ┌────────────────────┴────────────────────┐
        │ onNotificationPosted(sbn)               │ onNotificationRemoved(sbn)
        │ onListenerConnected()                   │ onListenerDisconnected()
        └────────────────────┬────────────────────┘
                             │ (Fast Filter Check)
                             ▼
                    [ NotificationParser ]
                             │ (Offloaded to Dispatchers.Default)
                             ▼
                  [ NotificationRepository ]
                             │
     ┌───────────────────────┴───────────────────────┐
     │                                               │
     ▼                                               ▼
[ Deduplication & StateFlow ]             [ LocalRiskEngine Triage ]
     │                                               │
     ▼                                               ▼
[ Compose Reactive UI Stream ]             [ GuardianOverlayService (Alert) ]
```

### Event Lifecycle:
1. `onListenerConnected()`: Fired when the Android OS binds to the service. Sets `isListenerConnected = true` and performs initial active notification sync off the main thread.
2. `onNotificationPosted(sbn)`: Triggered in real time when any app creates or updates a notification.
3. `onNotificationRemoved(sbn)`: Triggered when a notification is dismissed by the user or cancelled by the origin app.
4. `onListenerDisconnected()`: Updates connection state gracefully.

---

## 4. End-to-End Data Flow Architecture

- **`GuardianNotificationListenerService`**: Lightweight Android service; performs immediate null/filter triage and dispatches processing to background coroutines (`Dispatchers.Default`).
- **`NotificationParser`**: Extracts titles, body text (handling `BigText`, `InboxStyle`, and `MessagingStyle`), subtext, post time, categories, and channels while stripping control characters and sanitizing input.
- **`NotificationFilterManager`**: Filters apps before heavy triage (`ALL_APPS` vs `SELECTED_APPS`), always dropping Guardian's own package (`ai.guardian.defense`) to prevent feedback loops.
- **`NotificationRepository`**: Thread-safe state container exposing `recentEvents: StateFlow<List<NotificationEvent>>` and `isListenerConnected: StateFlow<Boolean>`.
- **`LocalRiskEngine`**: Scans text for phishing URLs, OTP extortion cues (*"share OTP to unblock"*), and fake reward schemes.
- **`MainActivity` (Jetpack Compose)**: Reactively displays live events with status badges, timestamps, and threat alerts.

---

## 5. Duplicate & Update Handling Strategy

Android apps frequently update existing notifications (e.g. download progress, incremental chat counts). Guardian uses a dual-key tracking strategy:
- **Notification Key:** Unique system key (`sbn.key`).
- **Content Hash:** MD5/Hash computation of `packageName + title + text + subText`.
- **Evaluation Logic:**
  - `Exact Duplicate` (`key` + `postTime` + `contentHash` unchanged) → **Ignored**.
  - `Updated Content` (`key` matches but `contentHash` or `postTime` changed) → Marked as **`isUpdate = true`** and updated in place in the reactive stream.
  - `New Notification` → Inserted at the top of the reactive stream.

---

## 6. Privacy & Security Measures

- **Zero Remote Transmission:** All notification parsing and risk triage is executed locally on-device. No notification text is uploaded to remote servers.
- **Input Sanitization:** Strips binary and control characters (`[\x00-\x1F]`) and clamps string sizes to prevent format string attacks or memory exhaustion.
- **Untrusted Input Rule:** Notification contents are treated strictly as untrusted text and never executed as intents, code, or commands.
- **Debug Logging Only:** Notification text is never logged to release Logcat.

---

## 7. How to Test the Feature

### Automated Unit Tests:
Run `NotificationTriageAndFilterTest.kt` in `app/src/test/java/`:
- Verifies self-package filter drop.
- Verifies duplicate detection and update tracking.
- Verifies string sanitization.
- Verifies OTP extortion and phishing URL detection.

### Manual Verification Flow:
1. Launch Guardian on an Android device or emulator.
2. In the **Notification Access** section, observe the initial state (`✕ DISABLED`).
3. Tap **"Enable Notification Access in Settings"**.
4. Enable Guardian in Android Settings and navigate back to the app.
5. The status automatically turns **`✓ GRANTED`** and **`CONNECTED`**.
6. Tap **"Simulate OTP Scam"** or **"Simulate Phish Link"** to watch the real-time parser and risk engine tag and escalate the notification instantly.
7. Post a real notification from WhatsApp, SMS, or Telegram and watch it appear in the **Real-Time Notification Stream**.

---

## 8. Known Android Quirks & Limitations
- **Work Profiles / Multi-User:** Notification listeners only observe notifications for the user space they are installed in.
- **Battery Optimization (OEM Whitelists):** On certain aggressive vendor OS builds (MIUI, ColorOS), ensure background battery optimization is set to "Unrestricted" so the OS does not kill the listener process.
- **Rebinding on Update:** Android automatically rebinds notification listeners after app upgrades once access is granted.

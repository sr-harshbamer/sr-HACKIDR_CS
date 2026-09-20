# Guardian — Real-Time Digital Scam & Fraud Protection

> **Proactive, explainable, pre-execution cybersecurity defense for URLs, QR/UPI payments, and live scam calls.**

---

## 🚀 Overview

Current scam-detection tools operate **reactively**: a victim must already suspect danger, copy the link or message, open an analysis application, paste the text, and wait for a verdict.

**Guardian replaces this with proactive, pre-execution defense:**
1. **User performs normal digital actions** (taps a link, scans a payment QR, receives a call).
2. **Guardian intercepts/evaluates the security-sensitive intent** before execution.
3. **Multi-agent AI investigates and evaluates risk statefully** (`SAFE` → `SUSPICIOUS` → `HIGH` → `CRITICAL`).
4. **Guardian triggers immediate barriers/heads-up warnings** *before* navigation or funds transfer.
5. **The user retains final control** with clear, plain-language evidence.

---

## 🌟 The 3 Hero Real-Time Experiences

### 1. Pre-Navigation URL Protection
* **The Problem:** Malicious links steal banking credentials via typosquatted domains (e.g. `hdfc-bankk-kyc.top`).
* **Guardian Solution:** Navigation intent is hooked *before* browser dispatch. Guardian inspects the domain age, TLD reputation, punycode lookalikes, and credential harvesting paths. If high risk, navigation is paused and a Guardian Pre-Navigation Warning Barrier is displayed with a 1-tap "Return to Safety".

### 2. Real-Time QR & UPI Payment Protection
* **The Problem:** Scammers send fake refund/cashback QR codes or `upi://pay` links claiming money will be credited, but approving with a UPI PIN debits the victim's account.
* **Guardian Solution:** Guardian parses the UPI intent, extracts the VPA handle, detects reverse debit traps, checks the national cyber fraud blacklist, and halts the payment handoff prior to UPI app PIN entry.

### 3. Real-Time Scam Call Trajectory Protection
* **The Problem:** Digital arrest and extortion calls manipulate victims using authority claims, artificial urgency, and live OTP demands.
* **Guardian Solution:** Guardian monitors conversational trajectories turn-by-turn. Rather than relying on unreliable voice tone, it tracks escalating manipulation stages:
  * Stage 1: Authority Claim (Police / Bank Security) → Risk: `SUSPICIOUS`
  * Stage 2: Artificial Urgency (15-min arrest deadline) → Risk: `HIGH`
  * Stage 3: Live OTP Solicitation → Risk: `HIGH`
  * Stage 4: Emergency Funds / Deposit Demand → Risk: `CRITICAL`
  * **Intervention:** A floating, high-priority Guardian Warning Overlay pops up **during the active call** directing the user to never disclose OTPs and offering an instant "End Call" button.

---

## 🧠 6-Agent AI Architecture

Guardian avoids monolithic prompts by distributing analysis across 6 specialized modules:

1. **Detection Agent:** Fast signature triage, URL scheme extraction, UPI URI parameter parsing, and call turn cue detection.
2. **Investigation Agent:** Deep entity correlation (domain age, TLD risk, typosquatting brand checks, VPA blacklist hits, conversational velocity).
3. **Evidence Agent:** Synthesizes affirmative vs contradictory signals and weights Bayesian confidence scores.
4. **Risk Agent:** Stateful risk engine managing `SAFE` → `SUSPICIOUS` → `HIGH` → `CRITICAL` transitions with explicit causal rationales.
5. **Response Agent:** Formulates automated intervention policies (`ALLOW`, `PAUSE_NAVIGATION`, `BLOCK_PAYMENT_HANDOFF`, `OVERLAY_CALL_INTERVENTION`).
6. **Explanation Agent:** Generates human-understandable breakdown layers (Why Flagged, Plain-English Consequences, Tailored Safe Actions, Official Reporting Guidance).

---

## 🔬 Engineering Specification: Real vs Limited vs Simulated

| Category | Component | Status | Technical Implementation |
| :--- | :--- | :--- | :--- |
| **REAL** | 6-Agent AI & Risk Engine | ✅ Real | Python FastAPI agentic pipeline with deterministic state machine transitions. |
| **REAL** | Persistent Storage | ✅ Real | SQLite database (`guardian.db`) tracking Users, Devices, Incidents, Evidence, Risk Events, and User Decisions. |
| **REAL** | Live WebSocket Events | ✅ Real | Sub-50ms real-time event broadcasting on `/api/ws/events`. |
| **REAL** | Threat Intelligence | ✅ Real | Indexed domain, UPI VPA, and phone number threat feeds with community reporting. |
| **REAL** | Typosquatting & UPI Parsers | ✅ Real | Algorithmic brand spoofing check, `tldextract`, and `upi://pay` URI scheme parsing. |
| **LIMITED** | Android URL Intercept | ⚠️ Limited | Implemented via local DNS / `VpnService` packet sinkhole and default browser intent filters (OS sandboxing prevents unprivileged third-party DOM modification). |
| **LIMITED** | UPI App PIN Control | ⚠️ Limited | Operates at *pre-handoff intent* time. Banking apps restrict third-party control inside their secure PIN entry UI. |
| **LIMITED** | Call Audio Processing | ⚠️ Limited | Uses Android `InCallService` / `TelecomManager` local speech transcription hooks. |
| **SIMULATED** | Interactive Mobile Emulator | 📱 Demo | Realistic Pixel 8 Pro device simulator in the web dashboard to demonstrate all 3 hero flows end-to-end. |

---

## 💻 Tech Stack

* **Backend:** Python 3.12, FastAPI, Uvicorn, SQLite3, PyJWT, WebSockets, Pydantic v2, Tldextract.
* **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.

---

## 🏃 Running Locally

### 1. Start the Backend API & WebSocket Hub
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* API Health Check: `http://localhost:8000/api/health`
* Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 2. Start the Frontend Dashboard & Mobile Shield Simulator
```bash
cd frontend
npm run dev
```
* Open in browser: `http://localhost:3000`

### 3. Demo Credentials
* **Username:** `alex_shield`
* **Password:** `guardian123`

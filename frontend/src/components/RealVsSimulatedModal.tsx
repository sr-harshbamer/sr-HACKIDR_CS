'use client';

import React from 'react';
import { X, CheckCircle, AlertTriangle, Cpu, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RealVsSimulatedModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white font-mono">
              ENGINEERING SPECIFICATION: REAL VS LIMITED VS SIMULATED
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          In cybersecurity, claims of universal, silent third-party interception across all apps are misleading. Guardian implements legitimate, robust interception architectures and clearly distinguishes what is operating in real code vs simulated demo environments.
        </p>

        {/* Section 1: REAL */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
            <CheckCircle className="h-4 w-4" />
            <span>REAL (Production-Ready Architecture)</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-1">
            <li><strong>6-Agent AI & Stateful Risk Engine:</strong> Detection, Investigation, Evidence, Risk, Response, and Explanation agents run real Python logic with persistent state transitions.</li>
            <li><strong>Persistent SQLite Storage:</strong> All users, devices, incidents, evidence matrices, risk events, and user decisions are stored in real disk-backed databases (`guardian.db`).</li>
            <li><strong>Real-Time Event WebSocket:</strong> Sub-50ms event broadcasting across active clients using standard WebSocket protocols.</li>
            <li><strong>Domain & Typosquatting Analysis:</strong> Real TLD extraction, entropy scoring, known brand imitation algorithms, and regex KYC path inspection.</li>
            <li><strong>UPI VPA & Reverse Debit Parser:</strong> Real parsing of `upi://pay` URI schemes, query parameters, category codes, and scam phrase signatures.</li>
            <li><strong>Turn-by-Turn Call Trajectory Analyzer:</strong> Evaluates escalating multi-turn coercion patterns (Authority Claim → Urgency → OTP Demand → Payment Demand).</li>
          </ul>
        </div>

        {/* Section 2: LIMITED */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
            <AlertTriangle className="h-4 w-4" />
            <span>LIMITED (OS & Platform Boundaries)</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-1">
            <li><strong>Android URL Interception:</strong> Achieved through Android `VpnService` (local DNS sinkhole) and Default Browser Intent filters. Android does not permit arbitrary background apps to silently alter Chrome&apos;s internal rendering without VPN or Accessibility hooks.</li>
            <li><strong>UPI Payment App Control:</strong> Third-party apps cannot modify internal screens inside GPay or PhonePe. Guardian intercepts the <em>pre-handoff</em> intent before the UPI app is launched. Once the user enters their PIN inside a banking app, OS sandboxing protects the PIN screen.</li>
            <li><strong>In-Call Audio Processing:</strong> Android 10+ restricts background audio recording. Guardian uses Android `InCallService` / `TelecomManager` or on-device Speech-to-Text accessibility hooks to analyze transcripts locally.</li>
          </ul>
        </div>

        {/* Section 3: SIMULATED */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono">
            <Cpu className="h-4 w-4" />
            <span>SIMULATED (Hackathon Demonstration Layer)</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-1">
            <li><strong>Interactive Mobile Viewport:</strong> Renders a browser-based Android device emulator to test end-to-end user journeys without requiring physical USB debugging.</li>
            <li><strong>Voice Stream Emulation:</strong> Conversational turns are transmitted chunk-by-chunk to the backend speech endpoint to showcase real-time dynamic risk changes during an active call.</li>
          </ul>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import {
  QrCode,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  AlertOctagon,
  Sparkles,
  Zap,
  ArrowRight,
  Bot,
  Globe,
  CreditCard,
  Bell,
  Radio,
} from 'lucide-react';

interface Props {
  onLaunchSimulatorWithScenario?: (type: 'call' | 'url' | 'upi' | 'notifications', payload?: any) => void;
}

export const GuardianDemoCenter: React.FC<Props> = ({
  onLaunchSimulatorWithScenario,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'audio' | 'sms' | 'links'>('qr');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const playScamAudio = (id: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (playingAudioId === id) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingAudioId(id);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.95;
    
    // Choose natural voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Guy'))
    );
    if (voice) utterance.voice = voice;

    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);

    window.speechSynthesis.speak(utterance);
  };

  // QR Code dataset
  const qrCodes = [
    {
      id: 'qr_refund_trap',
      title: '🚨 Reverse-Debit Refund Scam QR',
      category: 'UPI REVERSE DEBIT',
      risk: 'CRITICAL',
      amount: '₹8,500 Outbound Debit',
      handle: 'refund-support@xyz',
      payload: 'upi://pay?pa=refund-support@xyz&pn=Instant%20Refund%20Desk&am=8500&cu=INR&tn=Security%20Reversal',
      description: 'Disguised as a customer refund credit, but scanning this executes an outbound debit of ₹8,500 from the victim.',
      reasons: ['Inverted transaction flow (debit disguised as credit)', 'Disposable unverified VPA', 'Urgency note parameter'],
    },
    {
      id: 'qr_power_subsidy',
      title: '🚨 Fake Govt Electricity Subsidy QR',
      category: 'GOVT ADVANCE FEE',
      risk: 'CRITICAL',
      amount: '₹4,999 Outbound Debit',
      handle: 'gov-power-subsidy@okaxis',
      payload: 'upi://pay?pa=gov-power-subsidy@okaxis&pn=State%20Power%20Discount&am=4999&cu=INR&tn=Govt%20Rebate%20Deposit',
      description: 'Claims to provide state energy rebate, but tricks victim into authorizing a ₹4,999 merchant payment.',
      reasons: ['Impersonates Ministry of Power', 'Advance fee scheme', 'High-risk unverified recipient handle'],
    },
    {
      id: 'qr_phishing_link',
      title: '🚨 HDFC Banking Phishing Portal QR',
      category: 'PHISHING LOGIN',
      risk: 'CRITICAL',
      amount: 'Credential Harvesting',
      handle: 'hdfc-bankk-kyc.top',
      payload: 'https://hdfc-bankk-kyc.top/login-update',
      description: 'Encodes a typosquatted phishing portal mimicking official netbanking to harvest user password and OTP.',
      reasons: ['Typosquatted domain with double-k', 'Disposable .top phishing kit', 'Credential harvesting form'],
    },
    {
      id: 'qr_quicksupport_apk',
      title: '⚠️ Malicious Remote Access Tool QR',
      category: 'SCREEN SHARE MALWARE',
      risk: 'HIGH',
      amount: 'Device Hijack',
      handle: 'secure-quicksupport-dl.xyz',
      payload: 'https://secure-quicksupport-dl.xyz/apk/support.apk',
      description: 'Prompts victim to install a customized remote-access screen mirror tool allowing total phone control.',
      reasons: ['Direct unverified APK download', 'Screen sharing Trojan payload', 'Abuse of Accessibility services'],
    },
    {
      id: 'qr_safe_merchant',
      title: '✓ Verified Supermarket Merchant QR',
      category: 'SAFE PURCHASE',
      risk: 'SAFE',
      amount: '₹450 Groceries',
      handle: 'freshmart@icici',
      payload: 'upi://pay?pa=freshmart@icici&pn=Fresh%20Supermarket&am=450&cu=INR&tn=Groceries',
      description: 'Legitimate merchant QR registered with ICICI Bank with verified merchant category code (MCC).',
      reasons: ['Verified business banking registration', 'Standard purchase MCC code', 'No coercive metadata'],
    },
  ];

  // Audio Voice Scam Clips
  const audioClips = [
    {
      id: 'audio_customs',
      title: '🚨 FedEx Customs & Narcotics Seizure Extortion',
      speaker: 'Customs Desk (FedEx Mumbai)',
      duration: '18s',
      risk: 'CRITICAL (98/100)',
      script:
        'Hello, this is FedEx Courier Customs branch in Mumbai. A parcel addressed in your name containing 5 fake passports and 140 grams of contraband narcotics has been seized. You are placed under digital arrest. Transfer a ₹25,000 security bond right now to avoid immediate arrest.',
      cues: ['CUSTOMS_CONTRABAND', 'DIGITAL_ARREST', 'PAYMENT_DEMAND'],
    },
    {
      id: 'audio_cbi',
      title: '🚨 CBI Headquarters Digital Arrest Trap',
      speaker: 'Officer Rathore (CBI Cyber Crime)',
      duration: '16s',
      risk: 'CRITICAL (99/100)',
      script:
        'This is Officer Rathore from CBI HQ Delhi. Your bank account has been flagged in a ₹3.8 Crore international money laundering syndicate. You are under 24-hour Digital Arrest. Read out the 6-digit OTP sent to your mobile right now to lift the warrant.',
      cues: ['AUTHORITY_IMPERSONATION', 'DIGITAL_ARREST', 'OTP_REQUEST'],
    },
    {
      id: 'audio_power',
      title: '⚠️ Electricity Power Cut at 9:30 PM Scam',
      speaker: 'State Power Disconnection Division',
      duration: '14s',
      risk: 'CRITICAL (94/100)',
      script:
        'Dear consumer, your monthly electricity power bill is overdue. Your connection will be disconnected at 9:30 PM tonight. Call our billing executive immediately and download the QuickSupport app to update your ₹10 reconnection receipt.',
      cues: ['URGENCY_PRESSURE', 'REMOTE_ACCESS_REQUEST'],
    },
    {
      id: 'audio_sim',
      title: '⚠️ TRAI / SIM Deactivation in 2 Hours',
      speaker: 'Telecom Regulatory Officer',
      duration: '12s',
      risk: 'HIGH (75/100)',
      script:
        'Hello, your mobile SIM card will be deactivated within 2 hours due to pending KYC verification. Please confirm your 16-digit debit card number and date of birth right now.',
      cues: ['URGENCY_PRESSURE', 'CREDENTIAL_HARVESTING'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">
                THREAT SIMULATION & TESTING LAB
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Guardian Threat Demo Center</h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Live scannable QR codes, audible voice attack audio clips, and malicious payloads designed for testing Guardian AI with your phone camera, microphone, or simulated environment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-3 py-2 text-xs font-mono font-bold text-indigo-300">
              📸 POINT CAMERA AT SCREEN TO TEST
            </span>
          </div>
        </div>
      </div>

      {/* Lab Navigation Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === 'qr'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>1. Scannable QR Codes (5)</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === 'audio'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          <span>2. Live Voice Scam Player (4)</span>
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === 'sms'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>3. SMS & Notification Attacks</span>
        </button>
      </div>

      {/* TAB 1: SCANNABLE QR CODES */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>
                <strong>How to test:</strong> Point your physical Android phone camera / Google Lens or UPI scanner at the QR codes below to test intent interception!
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">5 LIVE TEST CODES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrCodes.map((qr) => (
              <div
                key={qr.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all hover:shadow-xl ${
                  qr.risk === 'CRITICAL'
                    ? 'border-rose-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/20'
                    : qr.risk === 'HIGH'
                    ? 'border-amber-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20'
                    : 'border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded px-2 py-0.5 text-[9px] font-mono font-bold ${
                        qr.risk === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : qr.risk === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {qr.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{qr.amount}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{qr.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{qr.description}</p>
                  </div>

                  {/* Scannable QR Code Image */}
                  <div className="flex justify-center py-2">
                    <div className="rounded-2xl bg-white p-3 shadow-md border-4 border-slate-800 inline-block">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          qr.payload
                        )}`}
                        alt={qr.title}
                        className="h-36 w-36 object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Payload info */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>ENCODED PAYLOAD:</span>
                      <button
                        onClick={() => copyToClipboard(qr.payload, qr.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        {copiedId === qr.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === qr.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 break-all leading-tight">{qr.payload}</div>
                  </div>
                </div>

                {/* Test in Simulator Button */}
                <button
                  onClick={() => {
                    if (onLaunchSimulatorWithScenario) {
                      if (qr.payload.startsWith('upi://')) {
                        onLaunchSimulatorWithScenario('upi', qr.payload);
                      } else {
                        onLaunchSimulatorWithScenario('url', qr.payload);
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition-all active:scale-95"
                >
                  <Smartphone className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Test in Mobile Simulator</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE VOICE SCAM CLIP PLAYER */}
      {activeTab === 'audio' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>How to test real-time listening:</strong> Click <strong>&ldquo;Play Voice Through PC Speakers&rdquo;</strong> while your phone has Guardian AI Live Mic open!
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 font-bold">4 HIGH-PRESSURE SCENARIOS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audioClips.map((clip) => (
              <div
                key={clip.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{clip.title}</span>
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-rose-400 border border-rose-500/30">
                      {clip.risk}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Speaker: {clip.speaker}</span>
                    <span>Duration: ~{clip.duration}</span>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-300 italic leading-relaxed border border-slate-800">
                    &ldquo;{clip.script}&rdquo;
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {clip.cues.map((c, i) => (
                      <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                        #{c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => playScamAudio(clip.id, clip.script)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      playingAudioId === clip.id
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {playingAudioId === clip.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span>{playingAudioId === clip.id ? 'Stop Playing' : 'Play Voice Loud'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onLaunchSimulatorWithScenario) {
                        onLaunchSimulatorWithScenario('call', { text: clip.script, name: clip.speaker });
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-200"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Run in Call AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SMS & NOTIFICATION ATTACKS */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-rose-500/30 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Bank Debit Card Blocked</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-mono text-rose-400 font-bold">
                  CRITICAL (96/100)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                SBI-ALERT: Your debit card ending in 4491 is BLOCKED. Call officer Sharma at 9876543210 and share OTP 889102 immediately to restore access.
              </p>
              <button
                onClick={() => onLaunchSimulatorWithScenario && onLaunchSimulatorWithScenario('notifications')}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-2 text-xs font-bold text-white"
              >
                Trigger in SMS Shield
              </button>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">WhatsApp ₹5,000 Cash Prize</span>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-mono text-rose-400 font-bold">
                  CRITICAL (92/100)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Congratulations Alex! You received ₹5,000 festive bonus. Claim instantly at https://hdfc-bankk-kyc.top/reward-claim before midnight.
              </p>
              <button
                onClick={() => onLaunchSimulatorWithScenario && onLaunchSimulatorWithScenario('notifications')}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 py-2 text-xs font-bold text-white"
              >
                Trigger in SMS Shield
              </button>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Telecom SIM KYC Deactivation</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-400 font-bold">
                  HIGH (70/100)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dear customer, your mobile connection will be suspended within 2 hours. Update Aadhaar details with officer.
              </p>
              <button
                onClick={() => onLaunchSimulatorWithScenario && onLaunchSimulatorWithScenario('notifications')}
                className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 py-2 text-xs font-bold text-white"
              >
                Trigger in SMS Shield
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

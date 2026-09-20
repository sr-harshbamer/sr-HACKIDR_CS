'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  CreditCard,
  PhoneCall,
  Globe,
  Radio,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { GuardianStats, SecurityEvent } from '../lib/guardianApi';

interface Props {
  stats: GuardianStats | null;
  events: SecurityEvent[];
  onSelectIncident: (id: number) => void;
  onOpenSimulator: (tab?: string) => void;
}

export const GuardianDashboard: React.FC<Props> = ({
  stats,
  events,
  onSelectIncident,
  onOpenSimulator,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner: Proactive Shield Status */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 shadow-xl">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">REAL-TIME PROACTIVE SHIELD: ACTIVE</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Guardian Autonomous Security Engine</h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Protecting digital actions before harm occurs: Pre-navigation URL intercept, pre-handoff UPI verification, and real-time live call trajectory monitoring.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenSimulator('url')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Zap className="h-4 w-4" />
              <span>Launch Live Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Threats Blocked</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <AlertOctagon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats?.threats_blocked ?? 4}</span>
            <span className="text-[11px] font-medium text-emerald-400">100% Intercepted</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Pre-execution barriers</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">UPI Payments Guarded</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats?.payments_protected ?? 3}</span>
            <span className="text-[11px] font-medium text-emerald-400">Pre-handoff checked</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">QR & UPI intent traps halted</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Suspicious Calls Intercepted</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <PhoneCall className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats?.calls_analyzed ?? 2}</span>
            <span className="text-[11px] font-medium text-amber-400">Live Voice Streams</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Real-time OTP/Payment warnings</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">URLs Pre-Inspected</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{stats?.urls_scanned ?? 8}</span>
            <span className="text-[11px] font-medium text-cyan-400">Pre-Navigation</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Typosquats & phishing kits</p>
        </div>
      </div>

      {/* Main Grid: Live Protection Feed + Three Hero Experiences Quick Launcher */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Protection Event Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h2 className="text-base font-semibold text-white">Live Protection Event Stream</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">WebSocket Telemetry Active</span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Radio className="mx-auto h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <p className="text-xs">Listening for proactive security events...</p>
                  <p className="text-[11px] text-slate-600 mt-1">Try triggering a demo in Mobile Shield simulator</p>
                </div>
              ) : (
                events.map((evt, idx) => {
                  const isWarning = evt.type === 'WARNING_TRIGGERED' || evt.type === 'PAYMENT_BLOCKED';
                  const isRiskChange = evt.type === 'RISK_CHANGED';
                  const isUrl = evt.type === 'URL_CLICKED';
                  const isUpi = evt.type === 'PAYMENT_INTENT_CREATED';
                  const isCall = evt.type === 'TRANSCRIPT_UPDATED';

                  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                  if (isWarning) badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                  else if (isRiskChange) badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  else if (isUrl) badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
                  else if (isUpi) badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  else if (isCall) badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';

                  return (
                    <div
                      key={evt.id || idx}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition-all ${
                        idx === 0 ? 'bg-slate-800/80 border-slate-700 shadow-md' : 'bg-slate-900/40 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-lg border px-2 py-1 text-[10px] font-mono font-bold uppercase ${badgeColor}`}>
                          {evt.type.replace('_', ' ')}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-200">
                            {evt.data?.url ||
                              evt.data?.vpa ||
                              evt.data?.snippet ||
                              evt.data?.reason ||
                              evt.data?.alert ||
                              'Security event processed'}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            {evt.data?.risk_level && (
                              <span className={`font-bold ${
                                evt.data.risk_level === 'CRITICAL' ? 'text-rose-400' :
                                evt.data.risk_level === 'HIGH' ? 'text-amber-400' :
                                evt.data.risk_level === 'SUSPICIOUS' ? 'text-yellow-400' : 'text-emerald-400'
                              }`}>
                                {evt.data.risk_level}
                              </span>
                            )}
                            {evt.data?.amount ? <span>Amount: ₹{evt.data.amount}</span> : null}
                            {evt.data?.caller ? <span>Caller: {evt.data.caller}</span> : null}
                            {evt.data?.target ? <span>Target: {evt.data.target}</span> : null}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: 3 Hero Interactive Triggers */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-white">Three Hero Demonstrations</h2>
            <p className="text-xs text-slate-400">
              Test Guardian&apos;s proactive interception capabilities in the live mobile emulator:
            </p>

            <div className="space-y-3">
              {/* Hero 1 Card */}
              <div
                onClick={() => onOpenSimulator('url')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-800/40 p-3 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        1. Pre-Navigation URL Intercept
                      </h3>
                      <p className="text-[11px] text-slate-400">Pauses browser navigation before loading spoofed domains</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Hero 2 Card */}
              <div
                onClick={() => onOpenSimulator('upi')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-800/40 p-3 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        2. Real-Time QR & UPI Protection
                      </h3>
                      <p className="text-[11px] text-slate-400">Halts deceptive refund handles before UPI app PIN entry</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Hero 3 Card */}
              <div
                onClick={() => onOpenSimulator('call')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-800/40 p-3 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                        3. Equal AI Call Screening Assistant
                      </h3>
                      <p className="text-[11px] text-slate-400">Two-way autonomous dialogue & live risk meter</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Hero 4 Card */}
              <div
                onClick={() => onOpenSimulator('notifications')}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-800/40 p-3 hover:border-rose-500/50 hover:bg-slate-800/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors">
                        4. Real-Time Push & SMS Shield
                      </h3>
                      <p className="text-[11px] text-slate-400">On-device triage for urgent OTP & banking extortion</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Proactive vs Reactive Explainer Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-2">
            <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">Architecture Advantage</span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-rose-950/20 border border-rose-900/30 p-2">
                <div className="text-[10px] font-bold text-rose-400">❌ Reactive (Old)</div>
                <p className="text-[10px] text-slate-400 mt-1">Victim must suspect threat, open app, paste link, check result.</p>
              </div>
              <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-2">
                <div className="text-[10px] font-bold text-emerald-400">✓ Guardian (Proactive)</div>
                <p className="text-[10px] text-slate-400 mt-1">Interception happens at intent time before navigation or PIN entry.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Security Incidents</h2>
            <p className="text-xs text-slate-400">Persisted in persistent SQLite database with full agentic audit trails</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <tr>
                <th className="pb-2">Incident #</th>
                <th className="pb-2">Threat Type</th>
                <th className="pb-2">Channel / Source</th>
                <th className="pb-2">Risk Level</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {(stats?.recent_incidents || []).map((inc: any) => (
                <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-mono text-slate-300 font-semibold">{inc.incident_number}</td>
                  <td className="py-3 text-white font-medium">{inc.threat_type}</td>
                  <td className="py-3 text-slate-400">{inc.source}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                        inc.risk_level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : inc.risk_level === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : inc.risk_level === 'SUSPICIOUS'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {inc.risk_level} ({inc.risk_score})
                    </span>
                  </td>
                  <td className="py-3 font-mono text-slate-300">{inc.status}</td>
                  <td className="py-3">
                    <button
                      onClick={() => onSelectIncident(inc.id)}
                      className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-emerald-400 font-medium transition-colors"
                    >
                      <span>Investigate</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

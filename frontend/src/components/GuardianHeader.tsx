'use client';

import React from 'react';
import {
  Shield,
  Smartphone,
  AlertTriangle,
  Database,
  Settings,
  User,
  LogOut,
  Radio,
  Info,
  Download,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { User as UserType } from '../lib/guardianApi';

interface Props {
  activeTab: 'dashboard' | 'simulator' | 'demo' | 'incidents' | 'intel' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'simulator' | 'demo' | 'incidents' | 'intel' | 'settings') => void;
  currentUser: UserType | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenRealVsSim: () => void;
  isWsConnected: boolean;
}

export const GuardianHeader: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenRealVsSim,
  isWsConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 shadow-lg shadow-emerald-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">GUARDIAN</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                PROACTIVE DEFENSE
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Real-Time Digital Scam & Fraud Protection</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className="hidden md:inline">Live</span> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'demo'
                ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <QrCode className="h-4 w-4 text-indigo-400" />
            <span>Demo Lab</span>
            <span className="rounded bg-indigo-500/30 px-1.5 py-0.2 text-[9px] font-bold text-indigo-300">QR & AUDIO</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Smartphone className="h-4 w-4 text-cyan-400" />
            <span>Mobile Shield</span>
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'incidents'
                ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Incidents</span>
          </button>

          <button
            onClick={() => setActiveTab('intel')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'intel'
                ? 'bg-slate-800 text-blue-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="h-4 w-4 text-blue-400" />
            <span className="hidden lg:inline">Threat</span> Intel
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-slate-200 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">Settings</span>
          </button>
        </nav>

        {/* Right side status & auth */}
        <div className="flex items-center gap-2.5">
          {/* Direct Download APK Button */}
          <a
            href="/download/guardian-ai-debug.apk"
            download="guardian-ai-debug.apk"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            title="Direct download Guardian Android APK (.apk)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download APK</span>
            <span className="sm:hidden">APK</span>
          </a>

          {/* WebSocket Live Telemetry Indicator */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
              {isWsConnected ? 'SOC CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          {/* User Profile / Auth Toggle */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs">
                <User className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-medium text-slate-200">{currentUser.full_name || currentUser.username}</span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                title="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { GuardianHeader } from '../components/GuardianHeader';
import { GuardianDashboard } from '../components/GuardianDashboard';
import { GuardianMobileSimulator } from '../components/GuardianMobileSimulator';
import { GuardianDemoCenter } from '../components/GuardianDemoCenter';
import { GuardianIncidentsView } from '../components/GuardianIncidentsView';
import { GuardianThreatIntel } from '../components/GuardianThreatIntel';
import { GuardianSettings } from '../components/GuardianSettings';
import { GuardianAuthModal } from '../components/GuardianAuthModal';
import { RealVsSimulatedModal } from '../components/RealVsSimulatedModal';
import { guardianApi, GuardianStats, SecurityEvent, User } from '../lib/guardianApi';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'demo' | 'incidents' | 'intel' | 'settings'>('dashboard');
  const [simulatorSubTab, setSimulatorSubTab] = useState<'url' | 'upi' | 'call' | 'notifications' | 'permissions'>('call');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [realVsSimOpen, setRealVsSimOpen] = useState(false);

  // Real-time Events & Stats state
  const [stats, setStats] = useState<GuardianStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);

  // Fetch initial dashboard stats & user
  const refreshStats = async () => {
    try {
      const data = await guardianApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const user = await guardianApi.getMe();
      setCurrentUser(user);
    } catch (err) {
      // Default demo fallback
      setCurrentUser({
        id: 1,
        username: 'alex_shield',
        email: 'alex@guardian-defense.ai',
        full_name: 'Alex Mercer',
      });
    }
  };

  useEffect(() => {
    checkCurrentUser();
    refreshStats();

    // Setup real-time WebSocket connection
    let ws: WebSocket | null = null;
    try {
      ws = guardianApi.createEventsWebSocket(
        (newEvent: SecurityEvent) => {
          setEvents((prev) => [newEvent, ...prev.slice(0, 40)]);
          // Auto refresh stats when incidents/threats occur
          if (['PAYMENT_BLOCKED', 'WARNING_TRIGGERED', 'USER_DECISION_RECORDED', 'INCIDENT_RESOLVED'].includes(newEvent.type)) {
            refreshStats();
          }
        },
        (connected: boolean) => {
          setIsWsConnected(connected);
        }
      );
    } catch (err) {
      console.error('WebSocket init error:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleSelectIncident = (id: number) => {
    setSelectedIncidentId(id);
    setActiveTab('incidents');
  };

  const handleOpenSimulator = (sub?: string) => {
    if (sub === 'url' || sub === 'upi' || sub === 'call' || sub === 'notifications' || sub === 'permissions') {
      setSimulatorSubTab(sub as any);
    }
    setActiveTab('simulator');
  };

  const handleLaunchSimulatorWithScenario = (type: 'call' | 'url' | 'upi' | 'notifications', payload?: any) => {
    setSimulatorSubTab(type);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <GuardianHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenRealVsSim={() => setRealVsSimOpen(true)}
        isWsConnected={isWsConnected}
      />

      {/* Main Viewport */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'dashboard' && (
          <GuardianDashboard
            stats={stats}
            events={events}
            onSelectIncident={handleSelectIncident}
            onOpenSimulator={handleOpenSimulator}
          />
        )}

        {activeTab === 'demo' && (
          <GuardianDemoCenter
            onLaunchSimulatorWithScenario={handleLaunchSimulatorWithScenario}
          />
        )}

        {activeTab === 'simulator' && (
          <GuardianMobileSimulator
            initialSubTab={simulatorSubTab}
            onIncidentCreated={refreshStats}
            onSelectIncident={handleSelectIncident}
          />
        )}

        {activeTab === 'incidents' && (
          <GuardianIncidentsView
            selectedIncidentId={selectedIncidentId}
            onClearSelectedIncident={() => setSelectedIncidentId(null)}
          />
        )}

        {activeTab === 'intel' && <GuardianThreatIntel />}

        {activeTab === 'settings' && <GuardianSettings />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-400">GUARDIAN DEFENSE PLATFORM</span>
            <span>•</span>
            <span>Real-Time Digital Scam Protection</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <button onClick={() => setRealVsSimOpen(true)} className="hover:text-cyan-400 transition-colors">
              Engineering Specs (Real vs Sim)
            </button>
            <span>v2.0.0</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GuardianAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          refreshStats();
        }}
      />

      <RealVsSimulatedModal
        isOpen={realVsSimOpen}
        onClose={() => setRealVsSimOpen(false)}
      />
    </div>
  );
}

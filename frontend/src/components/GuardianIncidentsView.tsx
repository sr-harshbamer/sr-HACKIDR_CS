'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  FileText,
  Activity,
  UserCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { guardianApi } from '../lib/guardianApi';

interface Props {
  selectedIncidentId: number | null;
  onClearSelectedIncident: () => void;
}

export const GuardianIncidentsView: React.FC<Props> = ({
  selectedIncidentId,
  onClearSelectedIncident,
}) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [detailModal, setDetailModal] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await guardianApi.listIncidents({
        risk_level: riskFilter === 'ALL' ? undefined : riskFilter,
      });
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [riskFilter]);

  useEffect(() => {
    if (selectedIncidentId) {
      openIncidentDetail(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const openIncidentDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await guardianApi.getIncidentDetail(id);
      setDetailModal(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const term = searchTerm.toLowerCase();
    return (
      inc.incident_number.toLowerCase().includes(term) ||
      inc.threat_type.toLowerCase().includes(term) ||
      inc.summary.toLowerCase().includes(term) ||
      inc.source.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Incident & Evidence Intelligence</h1>
          <p className="text-xs text-slate-400">
            Real-time auditable security incidents, agent reasoning traces, and evidence matrices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none font-mono"
          >
            <option value="ALL">ALL RISK LEVELS</option>
            <option value="CRITICAL">CRITICAL ONLY</option>
            <option value="HIGH">HIGH ONLY</option>
            <option value="SUSPICIOUS">SUSPICIOUS</option>
            <option value="SAFE">SAFE / VERIFIED</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading incidents...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No incidents match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-4">Incident Number</th>
                  <th className="py-3 px-4">Threat Classification</th>
                  <th className="py-3 px-4">Channel / Trigger</th>
                  <th className="py-3 px-4">Risk Verdict</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recorded At</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{inc.incident_number}</td>
                    <td className="py-3 px-4 text-white font-medium">{inc.threat_type}</td>
                    <td className="py-3 px-4 text-slate-400">{inc.source}</td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 font-mono text-slate-300">{inc.status}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(inc.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openIncidentDetail(inc.id)}
                        className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-emerald-400 font-medium transition-colors"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Deep Inspection Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-white">
                    {detailModal.incident.incident_number}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-mono ${
                      detailModal.incident.risk_level === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {detailModal.incident.risk_level} (Score: {detailModal.incident.risk_score}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400">{detailModal.incident.summary}</p>
              </div>

              <button
                onClick={() => {
                  setDetailModal(null);
                  onClearSelectedIncident();
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Evidence Matrix */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span>Evidence Matrix ({detailModal.evidence?.length || 0} Signals)</span>
              </h3>
              <div className="space-y-2">
                {(detailModal.evidence || []).map((ev: any) => (
                  <div key={ev.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{ev.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400">Weight: {ev.confidence_weight}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Events Trajectory */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                <span>Risk State Transitions</span>
              </h3>
              <div className="space-y-2">
                {(detailModal.risk_events || []).map((re: any) => (
                  <div key={re.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
                    <span className="font-mono text-amber-400 font-bold whitespace-nowrap">
                      {re.from_level} → {re.to_level}
                    </span>
                    <span className="text-slate-300">{re.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Actions Trace */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>Agent Execution Trace</span>
              </h3>
              <div className="space-y-2">
                {(detailModal.agent_actions || []).map((aa: any) => (
                  <div key={aa.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">{aa.agent_name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{aa.action_type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{aa.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* User Decision Outcome */}
            {detailModal.user_decisions?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  <span>User Decision Log</span>
                </h3>
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-xs space-y-1">
                  <div className="font-semibold text-purple-300">{detailModal.user_decisions[0].decision_type}</div>
                  <p className="text-[11px] text-slate-400">{detailModal.user_decisions[0].user_comment || 'No comment recorded'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

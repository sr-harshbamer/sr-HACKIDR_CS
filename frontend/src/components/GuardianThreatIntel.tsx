'use client';

import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';
import { guardianApi } from '../lib/guardianApi';

export const GuardianThreatIntel: React.FC = () => {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [entityType, setEntityType] = useState('domain');
  const [entityValue, setEntityValue] = useState('');
  const [riskCategory, setRiskCategory] = useState('PHISHING_BANK');
  const [notes, setNotes] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const data = await guardianApi.listThreatEntities();
      setEntities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityValue) return;
    try {
      await guardianApi.reportThreat({
        entity_type: entityType,
        entity_value: entityValue,
        risk_category: riskCategory,
        notes,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
        setEntityValue('');
        setNotes('');
        fetchEntities();
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Threat Intelligence Database</h1>
          <p className="text-xs text-slate-400">
            Real-time feed of blacklisted domains, deceptive UPI handles, and impersonation numbers.
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Report Threat Entity</span>
        </button>
      </div>

      {/* Threat Entities Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading intelligence data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entities.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400 uppercase">
                    {item.entity_type}
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">
                    Score: {item.reputation_score}/100
                  </span>
                </div>

                <div className="font-mono text-xs font-bold text-white break-all">{item.entity_value}</div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Category:</span>
                  <span className="text-slate-300 font-medium">{item.risk_category}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Community Reports:</span>
                  <span className="font-mono text-amber-400 font-bold">{item.report_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white">Report Scam Entity to Intelligence Network</h2>
            <form onSubmit={handleReport} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="domain">Domain / URL</option>
                  <option value="upi_vpa">UPI ID / Handle</option>
                  <option value="phone">Phone Number</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Entity Value (e.g. hdfc-login.top or user@upi)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter domain, handle or phone..."
                  value={entityValue}
                  onChange={(e) => setEntityValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Threat Category</label>
                <select
                  value={riskCategory}
                  onChange={(e) => setRiskCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="PHISHING_BANK">Bank Phishing</option>
                  <option value="UPI_REFUND_SCAM">Fake Refund Trap</option>
                  <option value="IMPERSONATION_CALL">Extortion / Digital Arrest</option>
                  <option value="LOTTERY_FRAUD">Lottery / Advance Fee Fraud</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Evidence</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSuccess}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-500"
                >
                  {reportSuccess ? 'Submitted ✓' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

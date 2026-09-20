'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, Bell, Zap, CheckCircle2 } from 'lucide-react';
import { guardianApi } from '../lib/guardianApi';

export const GuardianSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    url_protection: 1,
    upi_protection: 1,
    call_protection: 1,
    sms_protection: 1,
    auto_block_threshold: 80,
    aggressive_mode: 0,
    notifications_enabled: 1,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    guardianApi.getSettings().then((res) => {
      if (res) setSettings(res);
    });
  }, []);

  const handleSave = async () => {
    try {
      await guardianApi.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Protection Engine Settings</h1>
        <p className="text-xs text-slate-400">
          Configure real-time interception thresholds, intervention modes, and OS service policies.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm space-y-6">
        {/* Core Protection Shields */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            Active Protection Layers
          </h3>

          <div className="space-y-3">
            {/* URL Shield */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div>
                <div className="text-xs font-semibold text-white">Pre-Navigation URL Shield</div>
                <p className="text-[11px] text-slate-400">Inspects links at the intent level before browser dispatch.</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.url_protection)}
                onChange={(e) => setSettings({ ...settings, url_protection: e.target.checked ? 1 : 0 })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
            </div>

            {/* UPI Shield */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div>
                <div className="text-xs font-semibold text-white">Real-Time UPI / QR Payment Handoff Shield</div>
                <p className="text-[11px] text-slate-400">Detects reverse refund debit scams before banking app launch.</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.upi_protection)}
                onChange={(e) => setSettings({ ...settings, upi_protection: e.target.checked ? 1 : 0 })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
            </div>

            {/* Call Monitor */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div>
                <div className="text-xs font-semibold text-white">In-Call Trajectory & OTP Shield</div>
                <p className="text-[11px] text-slate-400">Renders live warning overlay during active extortion calls.</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.call_protection)}
                onChange={(e) => setSettings({ ...settings, call_protection: e.target.checked ? 1 : 0 })}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Threshold Slider */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white">Automatic Intervention Threshold</label>
            <span className="font-mono text-xs font-bold text-emerald-400">{settings.auto_block_threshold}/100</span>
          </div>
          <input
            type="range"
            min={50}
            max={95}
            value={settings.auto_block_threshold}
            onChange={(e) => setSettings({ ...settings, auto_block_threshold: parseInt(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <p className="text-[11px] text-slate-400">
            Threats scoring above this risk score will automatically pause navigation or halt payment handoffs.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Protection Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

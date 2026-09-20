'use client';

import React, { useState } from 'react';
import { X, Lock, User, Mail, Shield } from 'lucide-react';
import { guardianApi, User as UserType } from '../lib/guardianApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const GuardianAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('alex_shield');
  const [password, setPassword] = useState('guardian123');
  const [email, setEmail] = useState('alex@guardian-defense.ai');
  const [fullName, setFullName] = useState('Alex Mercer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const res = await guardianApi.register(username, email, password, fullName);
        onSuccess(res.user);
      } else {
        const res = await guardianApi.login(username, password);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-mono">
              {isRegister ? 'REGISTER NEW SHIELD' : 'SIGN IN TO GUARDIAN'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {isRegister && (
            <div>
              <label className="text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-slate-400 block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {!isRegister && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-400">
              💡 Demo Account: <strong>alex_shield</strong> / <strong>guardian123</strong>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all text-xs"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-[11px] text-slate-400 hover:text-white underline"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

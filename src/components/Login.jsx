import React, { useState } from 'react';
import { Layers, Key, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { auth } from '../data/auth';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await auth.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-8 rounded-3xl space-y-8 relative overflow-hidden border border-violet-500/20">

        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex bg-neon-gradient p-3.5 rounded-2xl text-white shadow-xl shadow-fuchsia-600/25 mb-2 animate-bounce">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-heading">
            Digital Buddies ERP
          </h1>
          <p className="text-sm text-slate-400">Internal Operating System & CMS</p>
        </div>

        {/* Credentials Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl flex items-start gap-3 text-rose-400 text-xs animate-shake relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold">Access Denied:</span> {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3.5 rounded-xl text-sm"
                placeholder="yourname@digitalbuddies.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3.5 rounded-xl text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-gradient hover:opacity-95 text-white font-bold py-4 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? 'Verifying Session...' : 'Secure Authorization'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />}
          </button>
        </form>

        {/* Footer */}
        <div className="relative z-10 pt-2 border-t border-slate-800/60 text-center">
          <p className="text-3xs text-slate-500">
            Contact your system administrator if you need access or have login issues.
          </p>
        </div>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { Layers, Key, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { auth } from '../data/auth';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="glass-panel w-full max-w-md sm:max-w-lg p-6 sm:p-8 rounded-3xl space-y-6 sm:space-y-8 relative overflow-hidden border border-violet-500/20 animate-scale-in">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl" />

        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex bg-neon-gradient p-3 sm:p-3.5 rounded-2xl text-white shadow-xl shadow-fuchsia-600/25 mb-2">
            <Layers className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-heading">
            Digital Buddies ERP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Internal Operating System & CMS</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 p-3 sm:p-4 rounded-xl flex items-start gap-3 text-rose-400 text-xs animate-fade-in relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Access Denied:</span> {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3.5 rounded-xl text-sm min-h-[48px]"
                placeholder="name@digitalbuddies.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-12 pr-12 py-3.5 rounded-xl text-sm min-h-[48px]"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-gradient hover:opacity-95 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer min-h-[52px] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              <>
                Secure Authorization
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>

        <div className="relative z-10 pt-2 border-t border-slate-800/60 text-center">
          <p className="text-[0.7rem] text-slate-500">
            Contact your admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

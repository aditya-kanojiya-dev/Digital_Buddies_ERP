import React, { useState, useEffect, useRef } from 'react';
import { Layers, Mail, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Button from './ui/Button';
import { Field, Input } from './ui/Field';
import { auth } from '../data/auth';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const emailRef                = useRef(null);

  // Auto-focus the email field on mount (a11y + faster login)
  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await auth.login(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient auth-bg flex items-center justify-center p-4">
      <div
        className="glass-panel w-full max-w-md p-7 sm:p-9 rounded-3xl space-y-7 relative overflow-hidden border border-[var(--color-border)]"
        role="dialog"
        aria-labelledby="login-title"
      >
        {/* Ambient glow — soft halos behind the form, not playful motion */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl bg-[var(--color-accent-soft)]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-56 h-56 rounded-full blur-3xl bg-[var(--color-accent-2-soft)]"
        />

        {/* Brand Header */}
        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex bg-neon-gradient p-3.5 rounded-2xl text-white shadow-lg shadow-[var(--glow)] mb-1">
            <Layers className="w-7 h-7" />
          </div>
          <h1
            id="login-title"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient"
          >
            Digital Buddies ERP
          </h1>
          <p className="text-sm text-[var(--color-text-3)]">
            Sign in to your workspace
          </p>
        </div>

        {/* Credentials Error */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/30 p-3.5 rounded-xl flex items-start gap-2.5 text-[var(--color-danger-text)] text-xs animate-shake relative z-10"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Access denied.</span> {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10" noValidate={false}>
          <Field label="Email" htmlFor="login-email" required>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none"
              />
              <Input
                id="login-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="you@digitalbuddies.com"
                required
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'login-error' : undefined}
                className="pl-10 pr-3 py-3"
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full glass-input rounded-xl pl-3.5 pr-10 py-3 text-sm text-[var(--color-text-1)] placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-1)] hover:bg-[var(--color-accent-soft)] transition cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            size="xl"
            loading={loading}
            icon={loading ? undefined : ArrowRight}
            className="w-full"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </Button>
        </form>

        {/* Footer */}
        <div className="relative z-10 pt-1 border-t border-[var(--color-border-muted)] flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
          <ShieldCheck className="w-3 h-3" />
          <p className="text-[0.65rem]">
            Need access? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

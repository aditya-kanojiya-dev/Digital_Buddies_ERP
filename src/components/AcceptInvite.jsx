import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../data/auth';

/**
 * AcceptInvite
 *
 * Rendered by App.jsx when the URL contains ?invite=<token>
 *
 * Flow:
 *  1. Look up the token in `employee_invites` table
 *  2. Validate — not used, not expired (7 h window)
 *  3. Employee sets a password
 *  4. Update Supabase Auth password + clear mustChangePassword flag
 *  5. Sign in automatically → call onInviteAccepted(sessionUser)
 */

const INVITE_EXPIRY_MS = 7 * 60 * 60 * 1000; // 7 hours

export default function AcceptInvite({ token, onInviteAccepted }) {
  const [status, setStatus]       = useState('validating'); // validating | ready | submitting | done | error
  const [invite, setInvite]       = useState(null);
  const [employee, setEmployee]   = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);

  // ── Step 1: validate token on mount ──────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setErrorMsg('No invite token found in the link.');
      setStatus('error');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      // Fetch invite record
      const { data: inv, error: invErr } = await supabase
        .from('employee_invites')
        .select('*')
        .eq('token', token)
        .single();

      if (invErr || !inv) {
        setErrorMsg('This invite link is invalid or has already been used.');
        setStatus('error');
        return;
      }

      // Check expiry
      const created = new Date(inv.created_at).getTime();
      if (Date.now() - created > INVITE_EXPIRY_MS) {
        setErrorMsg('This invite link has expired (7-hour window). Ask HR to resend the invite.');
        setStatus('error');
        return;
      }

      // Check already accepted
      if (inv.accepted) {
        setErrorMsg('This invite link has already been used. Please log in normally or ask HR to resend.');
        setStatus('error');
        return;
      }

      // Fetch matching employee
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('id', inv.employee_id)
        .single();

      if (empErr || !emp) {
        setErrorMsg('Employee record not found. Please contact HR.');
        setStatus('error');
        return;
      }

      setInvite(inv);
      setEmployee(emp);
      setStatus('ready');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while validating your link.');
      setStatus('error');
    }
  };

  // ── Step 2: set password & auto-login ────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setStatus('submitting');

    try {
      // 1. Sign in with the stored temp password so we have an active session
      //    (Supabase requires a session to call updateUser)
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    employee.email,
        password: employee.password, // temp password stored on the employee row
      });
      if (signInErr) throw new Error('Could not verify your account. Please ask HR to resend the invite.');

      // 2. Update the password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      // 3. Mark invite as accepted
      await supabase
        .from('employee_invites')
        .update({ accepted: true, accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      // 4. Clear mustChangePassword + set Active on employee row
      await supabase
        .from('employees')
        .update({ must_change_password: false, status: 'Active', password: null })
        .eq('id', employee.id);

      // 5. Build session user and hand off to App
      const sessionUser = {
        id:                 employee.id,
        email:              employee.email,
        name:               employee.name,
        role:               employee.role || 'Employee',
        department:         employee.department,
        designation:        employee.designation || '',
        avatar:             employee.avatar || '',
        mustChangePassword: false,
        status:             'Active',
        loginAt:            Date.now(),
      };
      sessionStorage.setItem('neomax_session', JSON.stringify(sessionUser));

      setStatus('done');
      // Small delay so the user sees the success state
      setTimeout(() => onInviteAccepted(sessionUser), 1400);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to set your password. Please try again.');
      setStatus('ready');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0b21] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Digital Buddies ERP</h1>
          <p className="text-sm text-slate-500 mt-1">Secure Employee Onboarding</p>
        </div>

        <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-7 shadow-2xl">

          {/* ── Validating ── */}
          {status === 'validating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-sm text-slate-400">Validating your invite link…</p>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100 mb-1">Link Invalid</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
              </div>
              <a
                href={window.location.origin}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition"
              >
                Go to login page
              </a>
            </div>
          )}

          {/* ── Success ── */}
          {status === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100 mb-1">You're all set!</h2>
                <p className="text-sm text-slate-400">Taking you to your dashboard…</p>
              </div>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin mt-2" />
            </div>
          )}

          {/* ── Set Password Form ── */}
          {(status === 'ready' || status === 'submitting') && employee && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Welcome, {employee.name}!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Set a secure password to activate your account. This link expires in 7 hours and works only once.
                </p>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Your Email</label>
                <input
                  type="email"
                  value={employee.email}
                  readOnly
                  className="w-full bg-slate-800/60 border border-slate-700 text-slate-400 text-sm rounded-xl px-4 py-2.5 cursor-not-allowed"
                />
              </div>

              {/* New password */}
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoFocus
                    className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 pr-10 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCf(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline error */}
              {errorMsg && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {status === 'submitting'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating account…</>
                  : 'Set Password & Enter'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Already have an account?{' '}
          <a href={window.location.origin} className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition">
            Log in here
          </a>
        </p>
      </div>
    </div>
  );
}

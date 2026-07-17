import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../data/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdge(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Unexpected error');
  }

  return data;
}

export default function AcceptInvite({ token, onInviteAccepted }) {
  const [status, setStatus] = useState('validating');
  const [employee, setEmployee] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invite token found in the link.');
      setStatus('error');
      return;
    }

    const validateToken = async () => {
      try {
        const data = await callEdge({ token });
        setEmployee(data.employee);
        setStatus('ready');
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
        setStatus('error');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Password must be at least 8 characters with 1 uppercase letter and 1 number.');
      return;
    }

    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setStatus('submitting');

    try {
      const data = await callEdge({
        token,
        password,
      });

      // Restore Supabase session
      if (data.session) {
        const { error: sessionErr } =
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

        if (sessionErr) {
          console.error('Failed to restore session after invite acceptance:', sessionErr.message);
        }
      } else {
        console.error('No session returned from invite edge function');
      }

      const sessionUser = {
        ...data.employee,
        loginAt: Date.now(),
      };

      sessionStorage.setItem(
        'neomax_session',
        JSON.stringify(sessionUser)
      );

      setStatus('done');

      setTimeout(() => {
        onInviteAccepted(sessionUser);
      }, 1400);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('ready');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0b21] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <ShieldCheck className="w-7 h-7 text-violet-400" />
          </div>

          <h1 className="text-xl font-bold text-slate-100">
            Digital Buddies ERP
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Secure Employee Onboarding
          </p>
        </div>

        <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-7 shadow-2xl">

          {status === 'validating' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-sm text-slate-400">
                Validating your invite link…
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-100 mb-1">
                  Link Invalid
                </h2>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {errorMsg}
                </p>
              </div>

              <a
                href={window.location.origin}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                Go to login page
              </a>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-100 mb-1">
                  You're all set!
                </h2>

                <p className="text-sm text-slate-400">
                  Taking you to your dashboard…
                </p>
              </div>

              <Loader2 className="w-5 h-5 text-violet-400 animate-spin mt-2" />
            </div>
          )}

          {(status === 'ready' || status === 'submitting') &&
            employee && (
              <form onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Welcome, {employee.name}!
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Set a secure password to activate your account.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
                    Your Email
                  </label>

                  <input
                    type="email"
                    value={employee.email}
                    readOnly
                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-400 text-sm rounded-xl px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPw((p) => !p)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <input
                      type={showCf ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) =>
                        setConfirm(e.target.value)
                      }
                      required
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCf((p) => !p)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCf ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-400">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl"
                >
                  {status === 'submitting'
                    ? 'Activating account...'
                    : 'Set Password & Enter'}
                </button>
              </form>
            )}
        </div>
      </div>
    </div>
  );
}
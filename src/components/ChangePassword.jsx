import { useState } from 'react';
import { Key, ShieldAlert, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../data/auth';
import { useToast } from './shared/Toast';

// Password policy: min 8 chars, at least 1 uppercase, at least 1 number
const POLICY = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasNumber: /[0-9]/,
};

function getPolicyErrors(pw) {
  const errors = [];
  if (pw.length < POLICY.minLength) errors.push(`At least ${POLICY.minLength} characters`);
  if (!POLICY.hasUppercase.test(pw)) errors.push('At least 1 uppercase letter');
  if (!POLICY.hasNumber.test(pw)) errors.push('At least 1 number');
  return errors;
}

export default function ChangePassword({ user, onPasswordUpdated }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const policyErrors = getPolicyErrors(newPassword);
  const policyMet = policyErrors.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!policyMet) {
      setError('Password does not meet the requirements below.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!currentPassword) {
      setError('Please enter your current password to confirm the change.');
      return;
    }

    setLoading(true);
    try {
      // Verify current password before allowing change
      await auth.login(user.email, currentPassword);
      await auth.changePassword(user.id, newPassword);
      toast.success('Password updated. Welcome to your dashboard.');
      onPasswordUpdated();
    } catch (err) {
      if (err.message.includes('Invalid email') || err.message.includes('credentials') || err.message.includes('invalid_credentials')) {
        setError('Temporary password is incorrect. Check your invite email or ask your admin to resend it.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl space-y-6 relative border border-violet-500/20">

        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-3xl" />

        {/* Info Alert header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-amber-500/10 p-3 rounded-2xl text-amber-400 border border-amber-500/20 mb-1">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-heading">Set Secure Password</h2>
          <p className="text-xs text-slate-400">
            Hi {user.name}, you are logging in with a temporary passcode. Please update it before proceeding.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl flex items-start gap-2.5 text-rose-450 text-2xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Change form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password confirmation */}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Temporary Password (from your invite email)</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                placeholder="Enter the temp password from your invite email"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-400 uppercase tracking-wider pl-1">New Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
              />
            </div>
          </div>

          {/* Live password policy checklist */}
          {newPassword.length > 0 && (
            <ul className="space-y-1 pl-1">
              {[
                { label: `At least ${POLICY.minLength} characters`, pass: newPassword.length >= POLICY.minLength },
                { label: 'At least 1 uppercase letter', pass: POLICY.hasUppercase.test(newPassword) },
                { label: 'At least 1 number', pass: POLICY.hasNumber.test(newPassword) },
              ].map(({ label, pass }) => (
                <li key={label} className={`flex items-center gap-1.5 text-2xs ${pass ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${pass ? 'opacity-100' : 'opacity-30'}`} />
                  {label}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1">
            <label className="text-2xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Confirm New Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs"
                placeholder="Repeat new password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !policyMet}
            className="w-full bg-neon-gradient hover:opacity-95 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Saving credentials...' : 'Update & Launch Dashboard'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

      </div>
    </div>
  );
}
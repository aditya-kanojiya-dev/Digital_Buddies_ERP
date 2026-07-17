import { useState } from 'react';
import { Shield, User, Key, Mail, Building, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../data/db';
import { supabase } from '../data/auth';
import { genId } from '../lib/format';

export default function SetupWizard({ onSetupComplete }) {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [companyName, setCompanyName] = useState('Digital Buddies');
  const [loading, setLoading]         = useState(false);
  const [step, setStep]               = useState('form'); // 'form' | 'confirm' | 'done'
  const [error, setError]             = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with 1 uppercase letter and 1 number.');
      return;
    }
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // ── Step 1: Create Supabase Auth user ──────────────────────────────────
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name, role: 'Super Admin' } }
      });

      if (signUpError) throw signUpError;

      // ── Step 2: Sign in to get an active session (needed for RLS INSERT) ───
      // If email confirmation is ON, signInWithPassword will still succeed
      // (Supabase allows sign-in before confirmation by default in most configs).
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (signInError) {
        // Confirmation email probably required — show instructions
        if (signInError.message?.toLowerCase().includes('confirm') ||
            signInError.message?.toLowerCase().includes('not confirmed')) {
          setStep('confirm');
          setLoading(false);
          return;
        }
        throw signInError;
      }

      // ── Step 3: Write the founder employee row ─────────────────────────────
      // NOTE: Do NOT store the password here. Supabase Auth owns credentials.
      // Capture the auth user's UUID so the employee row can be linked for RLS.
      const founderAuthId = signUpData?.user?.id || null;

      const founderEmp = {
        id:                 'EMP01',
        authUserId:         founderAuthId,
        name:               name.trim(),
        email:              normalizedEmail,
        phone:              '',
        role:               'Super Admin',
        department:         'Management',
        designation:        'Founder & CEO',
        salary:             0,
        joinDate:           new Date().toISOString().split('T')[0],
        bio:                `Founder & CEO of ${companyName}.`,
        skills:             'Management, Strategy, Leadership',
        managerId:          null,
        avatar:             '',
        status:             'Active',
        mustChangePassword: false,
        lastLogin:          new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      await db.addEmployee(founderEmp);

      // ── Step 4: Seed audit log ─────────────────────────────────────────────
      await db.addAuditLog({
        id:        genId('AUD'),
        userId:    'EMP01',
        action:    'ERP Bootstrapped',
        details:   `Founder ${name} set up ${companyName} ERP.`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });

      // ── Step 5: Save company name and store session ────────────────────────
      try {
        sessionStorage.setItem('neomax_company_settings', JSON.stringify({
          companyName,
          setupDate: new Date().toISOString().split('T')[0]
        }));
      } catch { /* non-critical */ }

      const sessionUser = {
        id:                 founderEmp.id,
        email:              founderEmp.email,
        name:               founderEmp.name,
        role:               founderEmp.role,
        department:         founderEmp.department,
        designation:        founderEmp.designation,
        avatar:             '',
        mustChangePassword: false,
        status:             'Active',
        loginAt:            Date.now()
      };
      sessionStorage.setItem('neomax_session', JSON.stringify(sessionUser));

      setStep('done');
      setTimeout(() => onSetupComplete(sessionUser), 1200);

    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message || 'Setup failed. Check your Supabase config and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation-email waiting screen ──────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl space-y-6 border border-amber-500/20 text-center">
          <div className="inline-flex bg-amber-500/10 p-4 rounded-2xl mb-2">
            <Mail className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Check your email</h2>
          <p className="text-sm text-slate-400">
            Supabase sent a confirmation link to <span className="text-violet-400 font-semibold">{email}</span>.
            Click it, then come back and refresh this page to continue setup.
          </p>
          <div className="text-xs text-slate-500 bg-slate-900/60 rounded-xl p-4 text-left space-y-2">
            <p className="font-semibold text-slate-400">Or turn off email confirmation:</p>
            <p>Supabase Dashboard → Authentication → Settings → uncheck <span className="text-violet-400">"Enable email confirmations"</span> → Save. Then refresh and run Setup again.</p>
          </div>
          <button
            onClick={() => { setStep('form'); setError(''); }}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl space-y-4 border border-emerald-500/20 text-center">
          <div className="inline-flex bg-emerald-500/10 p-4 rounded-2xl mb-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">ERP ready</h2>
          <p className="text-sm text-slate-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Main setup form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg p-8 rounded-3xl space-y-8 relative overflow-hidden border border-violet-500/20">

        <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex bg-neon-gradient p-3.5 rounded-2xl text-white shadow-xl shadow-fuchsia-600/25 mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Founder Setup Wizard
          </h1>
          <p className="text-sm text-slate-400">Initialize your company ERP</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 relative z-10">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Your name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs"
                  placeholder="Aditya Kanojiya"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Company name</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs"
                  placeholder="Digital Buddies"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3 rounded-xl text-sm"
                placeholder="you@yourcompany.com"
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
                className="w-full glass-input pl-12 pr-4 py-3 rounded-xl text-sm"
                placeholder="Min 8 characters"
                required
              />
            </div>
            {password.length > 0 && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) && (
              <p className="text-xs text-amber-400 pl-1">
                {password.length < 8 && 'At least 8 characters. '}
                {!/[A-Z]/.test(password) && '1 uppercase letter. '}
                {!/[0-9]/.test(password) && '1 number.'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-gradient hover:opacity-95 disabled:opacity-60 text-white font-bold py-4 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
          >
            {loading ? 'Setting up…' : 'Bootstrap & log in'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />}
          </button>

        </form>

      </div>
    </div>
  );
}

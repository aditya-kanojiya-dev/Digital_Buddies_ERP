import { useState } from 'react';
import { Settings as SettingsIcon, Building2, Save, Database, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Button, Field, Input } from './ui';
import { useToast } from './shared/Toast';

const SETTINGS_KEY = 'db_erp_settings';

export const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
};

export default function Settings({ user, state }) {
  const toast = useToast();
  const saved = loadSettings();

  const [company, setCompany] = useState(saved.company || 'Digital Buddies');
  const [tagline, setTagline] = useState(saved.tagline || 'Company Operating System');
  const [currency, setCurrency] = useState(saved.currency || 'INR');

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ company, tagline, currency }));
    toast.success('Settings saved', 'Workspace updated');
  };

  const counts = {
    Employees: state.employees?.length || 0,
    Clients: state.clients?.length || 0,
    Tasks: state.tasks?.length || 0,
    Invoices: state.invoices?.length || 0,
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Company profile and workspace preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" /> Company Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Name" htmlFor="company">
              <Input id="company" value={company} onChange={e => setCompany(e.target.value)} />
            </Field>
            <Field label="Company Tagline" htmlFor="tagline">
              <Input id="tagline" value={tagline} onChange={e => setTagline(e.target.value)} />
            </Field>
          </div>
          <Field label="Default Currency" htmlFor="currency">
            <select
              id="currency"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm min-h-[44px]"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </Field>
          <Button icon={Save} onClick={handleSave}>Save Settings</Button>
        </Card>

        <Card className="p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" /> Data Summary
          </h3>
          <div className="space-y-3">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-400">{k}</span>
                <span className="text-slate-200 font-bold font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {user.role === 'Super Admin' ? 'Full admin access' : `${user.role} access`}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

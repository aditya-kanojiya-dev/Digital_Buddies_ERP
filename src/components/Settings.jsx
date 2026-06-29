import React, { useState } from 'react';
import { Settings as SettingsIcon, Building2, Save, Database, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Button, Field, Input } from './ui';
import { useToast } from './shared/Toast';

const SETTINGS_KEY = 'db_erp_settings';

export const loadSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
};

/**
 * Settings — company profile + workspace preferences. Persisted to
 * localStorage (no dedicated settings table yet); the shape is small and
 * device-local which is appropriate for display/branding prefs.
 */
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
    <div className="space-y-6">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Company profile and workspace preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company profile */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" /> Company Profile
          </h3>

          <Field label="Company name">
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <Field label="Default currency" hint="Used across invoices, payroll and analytics.">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm cursor-pointer"
            >
              <option value="INR">INR — Indian Rupee (₹)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </Field>

          <div className="pt-2">
            <Button icon={Save} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Workspace info */}
        <div className="space-y-6">
          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Your Access
            </h3>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Role</span>
                <span className="font-bold text-violet-300">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department</span>
                <span className="font-bold text-slate-200">{user.department || '—'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" /> Data Summary
            </h3>
            <div className="text-xs space-y-2">
              {Object.entries(counts).map(([label, n]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-bold text-slate-200">{n}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

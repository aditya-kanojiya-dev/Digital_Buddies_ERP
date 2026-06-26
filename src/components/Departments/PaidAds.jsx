import React, { useState } from 'react';
import { Download, Plus, Check, RefreshCw, BarChart2, DollarSign, Calendar, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { useToast } from '../shared/Toast';

export default function PaidAds({ user, state, updateState }) {
  const toast = useToast();
  const { clients, adStats } = state;

  // ── Role gates ────────────────────────────────────────────────────────────
  const isManager = user.role === 'Super Admin' || user.role === 'Manager';

  const adsClients = clients.filter(c => c.department === 'Paid Ads');

  const [selectedClientId, setSelectedClientId] = useState(adsClients[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');

  // Daily stats log — all roles
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeAds, setActiveAds] = useState(0);
  const [lostAds, setLostAds] = useState(0);
  const [statsBudget, setStatsBudget] = useState(5000);

  // New Client Form — manager only
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDetails, setNewClientDetails] = useState('');
  const [newClientBudget, setNewClientBudget] = useState('');
  const [newClientStart, setNewClientStart] = useState('');

  // Plan Proposal Form — manager only
  const [planTitle, setPlanTitle] = useState('');
  const [planTarget, setPlanTarget] = useState('');
  const [planChannels, setPlanChannels] = useState('Facebook, Instagram');
  const [planBudgetAlloc, setPlanBudgetAlloc] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientStats = adStats.filter(s => s.clientId === selectedClientId);

  // Manager only — update client parameters
  const handleUpdateBudget = (e) => {
    e.preventDefault();
    if (!isManager) return;
    if (!selectedClientId) return;
    const updatedClients = clients.map(c =>
      c.id === selectedClientId
        ? { ...c, startDate: startDate || c.startDate, budget: parseFloat(dailyBudget) || c.budget }
        : c
    );
    updateState({ clients: updatedClients });
    toast.success(`Starting parameters updated for ${selectedClient?.name}`);
  };

  // All roles — log daily stats
  const handleLogStats = (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const newStat = {
      id: `AS${Date.now()}`,
      clientId: selectedClientId,
      date: statsDate,
      budget: parseFloat(statsBudget),
      activeAds: parseInt(activeAds),
      lostAds: parseInt(lostAds),
      loggedBy: user.name,
    };
    updateState({ adStats: [...adStats, newStat] });
    toast.success(`Stats logged for ${statsDate}`);
    setActiveAds(0);
    setLostAds(0);
  };

  // Manager only — add client
  const handleAddClient = (e) => {
    e.preventDefault();
    if (!isManager) return;
    if (!newClientName) return;
    const newClient = {
      id: `CL${Date.now()}`,
      name: newClientName,
      email: newClientEmail,
      phone: newClientPhone,
      details: newClientDetails,
      department: 'Paid Ads',
      budget: parseFloat(newClientBudget) || 100000,
      startDate: newClientStart || new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    updateState({ clients: [...clients, newClient] });
    setSelectedClientId(newClient.id);
    toast.success(`Client "${newClientName}" added`);
    setNewClientName(''); setNewClientEmail(''); setNewClientPhone('');
    setNewClientDetails(''); setNewClientBudget(''); setNewClientStart('');
  };

  const downloadReport = () => {
    if (!selectedClient) return;
    let csv = 'Date,Daily Budget,Active Ads,Lost Ads,Logged By\n';
    clientStats.forEach(s => {
      csv += `${s.date},${s.budget},${s.activeAds},${s.lostAds},${s.loggedBy || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient.name}_ads_report.csv`;
    a.click();
  };

  // Manager only — download plan
  const downloadPlan = () => {
    if (!isManager || !selectedClient) return;
    const planText = `
========================================
PAID ADS PLAN PROPOSAL - ${selectedClient.name.toUpperCase()}
========================================
Project Title: ${planTitle || 'Q3 Scaling Strategy'}
Target Audience: ${planTarget || '25-45 E-commerce shoppers interested in cosmetics'}
Marketing Channels: ${planChannels}
Allocated Budget: ₹${planBudgetAlloc || selectedClient.budget}

Prepared on: ${new Date().toLocaleDateString()}
Prepared by: ${user.name} — Paid Ads Team (NeoMax CMS)
========================================
`;
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient.name}_ads_plan.txt`;
    a.click();
    toast.success('Plan generated and downloaded.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Total Ads Clients</p>
            <h3 className="text-3xl font-bold mt-1 text-glow">{adsClients.length}</h3>
          </div>
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400"><BarChart2 className="w-6 h-6" /></div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Selected Client Budget</p>
            <h3 className="text-3xl font-bold mt-1 text-glow">₹{selectedClient?.budget?.toLocaleString() || 0}</h3>
          </div>
          <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400"><DollarSign className="w-6 h-6" /></div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Ad Stats Logs</p>
            <h3 className="text-3xl font-bold mt-1 text-glow">{clientStats.length} Days</h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Calendar className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Client Setup — manager only */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-violet-400" />
            Active Client Setup
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Select Active Client</label>
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full glass-input p-3 rounded-xl">
                <option value="">-- Choose Client --</option>
                {adsClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {isManager && selectedClient && (
              <form onSubmit={handleUpdateBudget} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full glass-input p-3 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Daily Budget (₹)</label>
                    <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder={selectedClient.budget} className="w-full glass-input p-3 rounded-xl" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-neon-gradient hover:opacity-90 py-3 rounded-xl text-white font-medium shadow-lg transition flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Update parameters
                </button>
              </form>
            )}
            {!isManager && (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2 border border-dashed border-slate-800 rounded-xl">
                <Lock className="w-6 h-6 text-slate-600" />
                <p className="text-sm text-slate-500">Client parameters are managed by your manager.</p>
              </div>
            )}
          </div>
        </div>

        {/* Log Daily Stats — all roles */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-fuchsia-400" />
            Log Daily Performance Stats
          </h2>
          <form onSubmit={handleLogStats} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Logging Date</label>
                <input type="date" value={statsDate} onChange={(e) => setStatsDate(e.target.value)} className="w-full glass-input p-3 rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Day Budget Used (₹)</label>
                <input type="number" value={statsBudget} onChange={(e) => setStatsBudget(e.target.value)} className="w-full glass-input p-3 rounded-xl" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Active Ads Count</label>
                <input type="number" value={activeAds} onChange={(e) => setActiveAds(e.target.value)} className="w-full glass-input p-3 rounded-xl" min="0" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Lost/Inactive Ads</label>
                <input type="number" value={lostAds} onChange={(e) => setLostAds(e.target.value)} className="w-full glass-input p-3 rounded-xl" min="0" required />
              </div>
            </div>
            <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2 shadow-lg" disabled={!selectedClientId}>
              <Plus className="w-5 h-5" /> Log Daily Stat Entry
            </button>
          </form>
        </div>
      </div>

      {/* Stats History */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-100">
            Ad Performance History {selectedClient && `- ${selectedClient.name}`}
          </h2>
          {selectedClient && clientStats.length > 0 && (
            <button onClick={downloadReport} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
              <Download className="w-4 h-4" /> Download Report (.csv)
            </button>
          )}
        </div>
        {clientStats.length === 0 ? (
          <p className="text-slate-400 text-center py-6">No performance statistics logged yet for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Daily Budget</th>
                  <th className="py-3 px-4">Active Ads</th>
                  <th className="py-3 px-4">Lost Ads</th>
                  <th className="py-3 px-4">Performance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {clientStats.map(s => {
                  const total = s.activeAds + s.lostAds;
                  const rate = total > 0 ? ((s.activeAds / total) * 100).toFixed(0) : '0';
                  return (
                    <tr key={s.id} className="text-slate-200 hover:bg-slate-900/30">
                      <td className="py-3 px-4">{s.date}</td>
                      <td className="py-3 px-4">₹{s.budget.toLocaleString()}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{s.activeAds}</td>
                      <td className="py-3 px-4 text-rose-400">{s.lostAds}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${parseInt(rate) > 75 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {rate}% Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Client + Plan Proposal — manager only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-400" />
            Register New Client
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          {isManager ? (
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Company/Client Name</label>
                <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="e.g. Aura Cosmetics" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email Address</label>
                  <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="contact@client.com" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Phone</label>
                  <input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="+91 99999..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Allocated Budget (₹)</label>
                  <input type="number" value={newClientBudget} onChange={(e) => setNewClientBudget(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="100000" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Proposed Start Date</label>
                  <input type="date" value={newClientStart} onChange={(e) => setNewClientStart(e.target.value)} className="w-full glass-input p-3 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Requirement Details</label>
                <textarea value={newClientDetails} onChange={(e) => setNewClientDetails(e.target.value)} className="w-full glass-input p-3 rounded-xl h-24" placeholder="Details about target audiences, niches..." />
              </div>
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition">Add Client Profile</button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
              <Lock className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Only managers can register new clients.</p>
            </div>
          )}
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-violet-400" />
            Prepare Marketing Plan
            {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
          </h2>
          {isManager ? (
            <form onSubmit={(e) => { e.preventDefault(); downloadPlan(); }} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Active Campaign Title</label>
                <input type="text" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="e.g. Festival Season Expansion" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Demographics / Interests</label>
                <input type="text" value={planTarget} onChange={(e) => setPlanTarget(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="e.g. Female age 18-30, interested in eco-beauty" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Target Channels</label>
                  <input type="text" value={planChannels} onChange={(e) => setPlanChannels(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder="Instagram, Youtube" required />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Allocated Budget (₹)</label>
                  <input type="number" value={planBudgetAlloc} onChange={(e) => setPlanBudgetAlloc(e.target.value)} className="w-full glass-input p-3 rounded-xl" placeholder={selectedClient?.budget || '50000'} />
                </div>
              </div>
              <button type="submit" className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2" disabled={!selectedClientId}>
                <Download className="w-5 h-5" /> Download Prepared Plan
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
              <Lock className="w-8 h-8 text-slate-600" />
              <p className="text-sm text-slate-500">Only managers can prepare marketing plans.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
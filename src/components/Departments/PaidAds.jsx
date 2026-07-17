import { useState, useMemo } from 'react';
import {
  Download, Plus, Check, BarChart2, TrendingUp, Lock,
  Layers, PieChart, Target, Edit3, Trash2, X, Save, Filter
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { db } from '../../data/db';
import { DatePicker, LineChart, BarChart, DonutChart } from '../ui';
import { today, addDays, genId } from '../../lib/format';

export default function PaidAds({ user, state, updateState }) {
  const toast = useToast();
  const { clients, adStats, adCampaigns } = state;
  const isManager = user.role === 'Super Admin' || user.role === 'Manager';

  const adsClients = clients.filter(c => c.department === 'Paid Ads');
  const [selectedClientId, setSelectedClientId] = useState(adsClients[0]?.id || '');
  const [activeTab, setActiveTab] = useState('overview');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientStats = adStats.filter(s => s.clientId === selectedClientId);
  const clientCampaigns = adCampaigns.filter(c => c.clientId === selectedClientId);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'dailylog', label: 'Daily Log', icon: TrendingUp },
    { id: 'clients', label: 'Clients & Plans', icon: Layers },
  ];

  const todayDate = today();

  // ── Computed metrics for Overview ───────────────────────────────────────
  const thisMonthStats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    const msStr = monthStart.toISOString().split('T')[0];
    const all = selectedClientId
      ? adStats.filter(s => s.clientId === selectedClientId)
      : adStats;
    return all.filter(s => s.logDate >= msStr);
  }, [adStats, selectedClientId]);

  const totalBudget = thisMonthStats.reduce((s, r) => s + (r.budget || 0), 0);
  const totalSpend = thisMonthStats.reduce((s, r) => s + (r.spend || 0), 0);
  const totalImpressions = thisMonthStats.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalClicks = thisMonthStats.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalConversions = thisMonthStats.reduce((s, r) => s + (r.conversions || 0), 0);
  const totalRevenue = thisMonthStats.reduce((s, r) => s + (r.revenue || 0), 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const avgROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';

  // ── Spend trend (last 30 days) ──────────────────────────────────────────
  const spendTrend = useMemo(() => {
    const points = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today(), -i);
      const dayStats = (selectedClientId ? clientStats : adStats).filter(s => s.logDate === d);
      const total = dayStats.reduce((s, r) => s + (r.spend || 0), 0);
      points.push({ label: `${new Date(d).getDate()}`, value: total || 0 });
    }
    return points;
  }, [adStats, selectedClientId, clientStats]);

  // ── Weekly active vs lost ───────────────────────────────────────────────
  const weeklyChart = useMemo(() => {
    const weeks = {};
    (selectedClientId ? clientStats : adStats).forEach(s => {
      if (!s.logDate) return;
      const d = new Date(s.logDate);
      const wk = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
      if (!weeks[wk]) weeks[wk] = { active: 0, lost: 0 };
      weeks[wk].active += s.activeAds || 0;
      weeks[wk].lost += s.lostAds || 0;
    });
    const sorted = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    return sorted.map(([k, v]) => ({ label: k.slice(-5), active: v.active, lost: v.lost }));
  }, [adStats, selectedClientId, clientStats]);

  // ── Budget allocation by client (donut) ─────────────────────────────────
  const budgetDonut = useMemo(() => {
    return adsClients.map(c => ({ label: c.name, value: c.budget })).filter(c => c.value > 0);
  }, [adsClients]);

  // ── Budget alert data ───────────────────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    return adsClients.map(c => {
      const stats = adStats.filter(s => s.clientId === c.id);
      const spent = stats.reduce((s, r) => s + (r.spend || 0), 0);
      const budget = c.budget || 1;
      const pct = Math.min(100, (spent / budget) * 100);
      return { client: c, spent, budget, pct };
    }).filter(b => b.pct > 0);
  }, [adsClients, adStats]);

  // ── Daily Log form ──────────────────────────────────────────────────────
  const [statsDate, setStatsDate] = useState(todayDate);
  const [activeAds, setActiveAds] = useState(0);
  const [lostAds, setLostAds] = useState(0);
  const [statsBudget, setStatsBudget] = useState(5000);
  const [spend, setSpend] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');
  const [revenue, setRevenue] = useState('');
  const [campaignId, setCampaignId] = useState('');

  const handleLogStats = (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const newStat = {
      id: genId('AS'),
      clientId: selectedClientId,
      logDate: statsDate,
      budget: parseFloat(statsBudget),
      activeAds: parseInt(activeAds) || 0,
      lostAds: parseInt(lostAds) || 0,
      loggedBy: user.name,
      spend: parseFloat(spend) || 0,
      impressions: parseInt(impressions) || 0,
      clicks: parseInt(clicks) || 0,
      conversions: parseInt(conversions) || 0,
      revenue: parseFloat(revenue) || 0,
      campaignId: campaignId || null,
    };
    updateState({ adStats: [...adStats, newStat] });
    toast.success(`Stats logged for ${statsDate}`);
    setActiveAds(0); setLostAds(0); setSpend(''); setImpressions('');
    setClicks(''); setConversions(''); setRevenue(''); setCampaignId('');
  };

  // ── CSV export ──────────────────────────────────────────────────────────
  const downloadReport = () => {
    if (!selectedClient) return;
    let csv = 'Date,Daily Budget,Spend,Active Ads,Lost Ads,Impressions,Clicks,CTR,Conversions,CPA,Revenue,ROAS,Logged By\n';
    clientStats.forEach(s => {
      const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(2) + '%' : '0%';
      const cpa = s.conversions > 0 ? (s.spend / s.conversions).toFixed(2) : '-';
      const roas = s.spend > 0 ? (s.revenue / s.spend).toFixed(2) : '-';
      csv += `${s.logDate},${s.budget},${s.spend || 0},${s.activeAds},${s.lostAds},${s.impressions || 0},${s.clicks || 0},${ctr},${s.conversions || 0},${cpa},${s.revenue || 0},${roas},${s.loggedBy || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient.name}_ads_report.csv`;
    a.click();
  };

  // ── Client Setup ────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');

  const handleUpdateBudget = (e) => {
    e.preventDefault();
    if (!isManager || !selectedClientId) return;
    const updatedClients = clients.map(c =>
      c.id === selectedClientId
        ? { ...c, startDate: startDate || c.startDate, budget: parseFloat(dailyBudget) || c.budget }
        : c
    );
    updateState({ clients: updatedClients });
    toast.success(`Starting parameters updated for ${selectedClient?.name}`);
  };

  // ── Campaign CRUD ───────────────────────────────────────────────────────
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editCampaignId, setEditCampaignId] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignChannel, setCampaignChannel] = useState('Meta');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');

  const resetCampaignForm = () => {
    setCampaignName(''); setCampaignChannel('Meta'); setCampaignObjective('');
    setCampaignBudget(''); setCampaignStart(''); setCampaignEnd('');
    setEditCampaignId(null); setShowCampaignForm(false);
  };

  const handleSaveCampaign = (e) => {
    e.preventDefault();
    if (!isManager || !selectedClientId || !campaignName.trim()) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    if (editCampaignId) {
      updateState({
        adCampaigns: adCampaigns.map(c =>
          c.id === editCampaignId
            ? { ...c, name: campaignName.trim(), channel: campaignChannel, objective: campaignObjective, budgetAllocated: parseFloat(campaignBudget) || 0, startDate: campaignStart || c.startDate, endDate: campaignEnd || null }
            : c
        )
      });
      toast.success('Campaign updated');
    } else {
      const newCampaign = {
        id: genId('CMP'),
        clientId: selectedClientId,
        name: campaignName.trim(),
        channel: campaignChannel,
        objective: campaignObjective,
        budgetAllocated: parseFloat(campaignBudget) || 0,
        startDate: campaignStart || todayDate,
        endDate: campaignEnd || null,
        status: 'Active',
        createdBy: user.name,
        createdAt: now,
      };
      updateState({ adCampaigns: [...adCampaigns, newCampaign] });
      toast.success(`Campaign "${campaignName}" created`);
    }
    resetCampaignForm();
  };

  const handleEditCampaign = (c) => {
    setEditCampaignId(c.id);
    setCampaignName(c.name);
    setCampaignChannel(c.channel);
    setCampaignObjective(c.objective || '');
    setCampaignBudget(String(c.budgetAllocated || ''));
    setCampaignStart(c.startDate || '');
    setCampaignEnd(c.endDate || '');
    setShowCampaignForm(true);
  };

  const handleDeleteCampaign = async (id) => {
    if (!isManager) return;
    const fresh = await db.deleteAdCampaign(id);
    updateState({ adCampaigns: fresh });
    toast.success('Campaign deleted');
  };

  // ── New Client Form ─────────────────────────────────────────────────────
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDetails, setNewClientDetails] = useState('');
  const [newClientBudget, setNewClientBudget] = useState('');
  const [newClientStart, setNewClientStart] = useState('');

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!isManager || !newClientName) return;
    const newClient = {
      id: genId('CL'),
      name: newClientName,
      email: newClientEmail,
      phone: newClientPhone,
      details: newClientDetails,
      department: 'Paid Ads',
      budget: parseFloat(newClientBudget) || 100000,
      startDate: newClientStart || todayDate,
      status: 'Active',
    };
    updateState({ clients: [...clients, newClient] });
    setSelectedClientId(newClient.id);
    toast.success(`Client "${newClientName}" added`);
    setNewClientName(''); setNewClientEmail(''); setNewClientPhone('');
    setNewClientDetails(''); setNewClientBudget(''); setNewClientStart('');
  };

  // ── Plan Proposal ───────────────────────────────────────────────────────
  const [planTitle, setPlanTitle] = useState('');
  const [planTarget, setPlanTarget] = useState('');
  const [planChannels, setPlanChannels] = useState('Facebook, Instagram');
  const [planBudgetAlloc, setPlanBudgetAlloc] = useState('');

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

  // ── Spend-to-date for a campaign ────────────────────────────────────────
  const campaignSpend = (campId) =>
    clientStats.filter(s => s.campaignId === campId).reduce((s, r) => s + (r.spend || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header: client selector + tab bar ── */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Paid Ads</h2>
            <p className="text-sm text-slate-400">{adsClients.length} active clients</p>
          </div>
        </div>
        <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
          className="glass-input p-2.5 rounded-xl text-sm min-w-[200px]">
          <option value="">-- All Clients --</option>
          {adsClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === t.id ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1 — OVERVIEW                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-400">Total Budget</p>
              <p className="text-xl font-bold text-glow mt-1">₹{totalBudget.toLocaleString()}</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-400">Actual Spend</p>
              <p className="text-xl font-bold text-glow mt-1">₹{totalSpend.toLocaleString()}</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-400">Avg CTR</p>
              <p className="text-xl font-bold text-violet-400 mt-1">{avgCTR}%</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-400">Conversions</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{totalConversions}</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-400">ROAS</p>
              <p className="text-xl font-bold text-fuchsia-400 mt-1">{avgROAS}x</p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Spend Trend (30 days)</h3>
              <LineChart data={spendTrend} color="#f472b6" />
            </div>
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Active vs Lost (weekly)</h3>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <BarChart data={weeklyChart.map(w => ({ label: w.label, value: w.active }))} color="#34d399" />
                  <p className="text-3xs text-emerald-400 text-center mt-1">Active Ads</p>
                </div>
                <div className="flex-1">
                  <BarChart data={weeklyChart.map(w => ({ label: w.label, value: w.lost }))} color="#f87171" />
                  <p className="text-3xs text-rose-400 text-center mt-1">Lost Ads</p>
                </div>
              </div>
            </div>
          </div>

          {/* Donut + Budget Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl flex items-center gap-6">
              <DonutChart data={budgetDonut} size={140} thickness={24} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Budget Allocation</h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {budgetDonut.map((d, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-400">{d.label}</span>
                      <span className="text-slate-200 font-medium">₹{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Budget vs Spend</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {budgetAlerts.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No spend data yet</p>}
                {budgetAlerts.map(b => {
                  const color = b.pct >= 100 ? 'bg-rose-500' : b.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div key={b.client.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{b.client.name}</span>
                        <span className={`font-semibold ${b.pct >= 100 ? 'text-rose-400' : b.pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          ₹{b.spent.toLocaleString()} / ₹{b.budget.toLocaleString()} ({b.pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2 — CAMPAIGNS                                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">
              Campaigns {selectedClient && `- ${selectedClient.name}`}
            </h3>
            {isManager && (
              <button onClick={() => { resetCampaignForm(); setShowCampaignForm(true); }}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
                <Plus className="w-4 h-4" /> New Campaign
              </button>
            )}
          </div>

          {showCampaignForm && (
            <div className="glass-panel p-5 rounded-2xl border border-fuchsia-500/20">
              <form onSubmit={handleSaveCampaign} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Campaign Name</label>
                    <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Channel</label>
                    <select value={campaignChannel} onChange={e => setCampaignChannel(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm">
                      <option value="Meta">Meta</option>
                      <option value="Google">Google</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Twitter">Twitter</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Objective</label>
                    <input type="text" value={campaignObjective} onChange={e => setCampaignObjective(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="e.g. Brand Awareness" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Allocated Budget</label>
                    <input type="number" value={campaignBudget} onChange={e => setCampaignBudget(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" />
                  </div>
                  <div>
                    <DatePicker label="Start Date" value={campaignStart} onChange={setCampaignStart} />
                  </div>
                  <div>
                    <DatePicker label="End Date" value={campaignEnd} onChange={setCampaignEnd} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-neon-gradient px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                    <Save className="w-4 h-4" /> {editCampaignId ? 'Update' : 'Create'} Campaign
                  </button>
                  <button type="button" onClick={resetCampaignForm}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {clientCampaigns.length === 0 && !selectedClientId && (
            <p className="text-slate-400 text-center py-8 text-sm">Select a client to view campaigns</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientCampaigns.map(c => {
              const sptd = campaignSpend(c.id);
              const pct = c.budgetAllocated > 0 ? Math.min(100, (sptd / c.budgetAllocated) * 100) : 0;
              return (
                <div key={c.id} className="glass-card p-5 rounded-2xl">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-100">{c.name}</h4>
                      <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${
                        c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>{c.status}</span>
                    </div>
                    {isManager && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEditCampaign(c)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-slate-500">Channel:</span> <span className="text-slate-300">{c.channel}</span></div>
                    <div><span className="text-slate-500">Objective:</span> <span className="text-slate-300">{c.objective || '-'}</span></div>
                    <div><span className="text-slate-500">Budget:</span> <span className="text-slate-300">₹{c.budgetAllocated.toLocaleString()}</span></div>
                    <div><span className="text-slate-500">Spent:</span> <span className="text-slate-300">₹{sptd.toLocaleString()}</span></div>
                  </div>
                  {c.budgetAllocated > 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isManager && selectedClientId && clientCampaigns.length === 0 && (
            <p className="text-slate-400 text-center py-4 text-sm border border-dashed border-slate-800 rounded-xl">
              No campaigns yet for this client.
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3 — DAILY LOG (FIXED)                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dailylog' && (
        <div className="space-y-6">
          {/* Log form */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-fuchsia-400" />
              Log Daily Performance Stats
            </h3>
            <form onSubmit={handleLogStats} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <DatePicker label="Date" value={statsDate} onChange={setStatsDate} required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Planned Budget (₹)</label>
                  <input type="number" value={statsBudget} onChange={e => setStatsBudget(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Actual Spend (₹)</label>
                  <input type="number" value={spend} onChange={e => setSpend(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Campaign</label>
                  <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm">
                    <option value="">— None —</option>
                    {clientCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Active Ads</label>
                  <input type="number" value={activeAds} onChange={e => setActiveAds(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lost Ads</label>
                  <input type="number" value={lostAds} onChange={e => setLostAds(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Impressions</label>
                  <input type="number" value={impressions} onChange={e => setImpressions(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Clicks</label>
                  <input type="number" value={clicks} onChange={e => setClicks(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Conversions</label>
                  <input type="number" value={conversions} onChange={e => setConversions(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Attributed Revenue (₹)</label>
                  <input type="number" value={revenue} onChange={e => setRevenue(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" min="0" />
                </div>
              </div>
              <button type="submit" disabled={!selectedClientId}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 rounded-xl text-white font-medium transition flex items-center gap-2 shadow-lg">
                <Plus className="w-5 h-5" /> Log Daily Stat Entry
              </button>
            </form>
          </div>

          {/* History table */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-slate-100">
                Ad Performance History {selectedClient && `- ${selectedClient.name}`}
              </h3>
              {selectedClient && clientStats.length > 0 && (
                <button onClick={downloadReport}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
                  <Download className="w-4 h-4" /> CSV
                </button>
              )}
            </div>
            {clientStats.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">No performance statistics logged yet for this client.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Budget</th>
                      <th className="py-3 px-3">Spend</th>
                      <th className="py-3 px-3">Active</th>
                      <th className="py-3 px-3">Lost</th>
                      <th className="py-3 px-3">Impr.</th>
                      <th className="py-3 px-3">Clicks</th>
                      <th className="py-3 px-3">CTR</th>
                      <th className="py-3 px-3">Conv.</th>
                      <th className="py-3 px-3">CPA</th>
                      <th className="py-3 px-3">Rev.</th>
                      <th className="py-3 px-3">ROAS</th>
                      <th className="py-3 px-3">Budget</th>
                      <th className="py-3 px-3">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[...clientStats].reverse().map(s => {
                      const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toFixed(1) : '0.0';
                      const cpa = s.conversions > 0 ? (s.spend / s.conversions).toFixed(0) : '-';
                      const roas = s.spend > 0 ? (s.revenue / s.spend).toFixed(2) : '-';
                      const budgetDiff = (s.spend || 0) - (s.budget || 0);
                      return (
                        <tr key={s.id} className="text-slate-200 hover:bg-slate-900/30 text-xs">
                          <td className="py-2.5 px-3">{s.logDate}</td>
                          <td className="py-2.5 px-3">₹{s.budget?.toLocaleString()}</td>
                          <td className="py-2.5 px-3">₹{(s.spend || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{s.activeAds}</td>
                          <td className="py-2.5 px-3 text-rose-400">{s.lostAds}</td>
                          <td className="py-2.5 px-3">{(s.impressions || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-3">{s.clicks || 0}</td>
                          <td className="py-2.5 px-3">{ctr}%</td>
                          <td className="py-2.5 px-3">{s.conversions || 0}</td>
                          <td className="py-2.5 px-3">{cpa}</td>
                          <td className="py-2.5 px-3">₹{(s.revenue || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-3">{roas}x</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-medium ${
                              budgetDiff > 0 ? 'bg-rose-500/10 text-rose-400' :
                              budgetDiff < 0 ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                              {budgetDiff > 0 ? `+₹${budgetDiff}` : budgetDiff < 0 ? `-₹${Math.abs(budgetDiff)}` : 'On track'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{s.loggedBy || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4 — CLIENTS & PLANS                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {/* Active Client Setup */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Filter className="w-5 h-5 text-violet-400" />
              Active Client Setup
              {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
            </h3>
            {isManager && selectedClient && (
              <form onSubmit={handleUpdateBudget} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <DatePicker label="Start Date" value={startDate} onChange={setStartDate} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Daily Budget (₹)</label>
                  <input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)}
                    placeholder={String(selectedClient.budget)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="bg-neon-gradient hover:opacity-90 px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> Update
                  </button>
                </div>
              </form>
            )}
            {!isManager && (
              <div className="flex items-center justify-center py-4 gap-2 border border-dashed border-slate-800 rounded-xl">
                <Lock className="w-5 h-5 text-slate-600" />
                <p className="text-sm text-slate-500">Client parameters are managed by your manager.</p>
              </div>
            )}
          </div>

          {/* Register New Client */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                Register New Client
                {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
              </h3>
              {isManager ? (
                <form onSubmit={handleAddClient} className="space-y-4">
                  <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Company/Client Name" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Email" />
                    <input type="text" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Phone" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={newClientBudget} onChange={e => setNewClientBudget(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Allocated Budget" />
                    <DatePicker value={newClientStart} onChange={setNewClientStart} placeholderText="Start date" />
                  </div>
                  <textarea value={newClientDetails} onChange={e => setNewClientDetails(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm h-20" placeholder="Requirement details..." />
                  <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-white text-sm font-medium transition">
                    Add Client Profile
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-slate-800 rounded-xl">
                  <Lock className="w-6 h-6 text-slate-600" />
                  <p className="text-sm text-slate-500">Only managers can register new clients.</p>
                </div>
              )}
            </div>

            {/* Prepare Marketing Plan */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-violet-400" />
                Prepare Marketing Plan
                {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3.5 h-3.5" /> Manager only</span>}
              </h3>
              {isManager ? (
                <form onSubmit={e => { e.preventDefault(); downloadPlan(); }} className="space-y-4">
                  <input type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Campaign Title" required />
                  <input type="text" value={planTarget} onChange={e => setPlanTarget(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Target Audience" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={planChannels} onChange={e => setPlanChannels(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Channels" />
                    <input type="number" value={planBudgetAlloc} onChange={e => setPlanBudgetAlloc(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder={String(selectedClient?.budget || '50000')} />
                  </div>
                  <button type="submit" disabled={!selectedClientId}
                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-xl text-white text-sm font-medium transition flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Download Prepared Plan
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-slate-800 rounded-xl">
                  <Lock className="w-6 h-6 text-slate-600" />
                  <p className="text-sm text-slate-500">Only managers can prepare plans.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import {
  PieChart,
  CreditCard,
  Wallet,
  Briefcase,
  Users,
  CheckSquare,
  Download,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  Card,
  Button,
  EmptyState,
  LineChart,
  BarChart,
  DonutChart,
  Sparkline,
} from './ui';
import { fmtCurrency, fmtDate } from '../lib/format';
import { exportCsv } from '../lib/exportCsv';
import { useToast } from './shared/Toast';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_TONES = {
  New: '#38bdf8',
  'In Progress': '#a78bfa',
  Review: '#fbbf24',
  Completed: '#34d399',
  Blocked: '#fb7185',
};

export default function Analytics({ state }) {
  const toast = useToast();
  const { invoices = [], tasks = [], leads = [], clients = [], employees = [], projects = [] } = state;

  // ── Revenue (last 6 months from paid invoices) ────────────────────────────
  const revenueSeries = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    invoices
      .filter((inv) => inv.status === 'Paid')
      .forEach((inv) => {
        const d = new Date(inv.dueDate || inv.createdAt);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in idx) buckets[idx[key]].value += Number(inv.amount) || 0;
      });
    return buckets;
  }, [invoices]);

  const totalRevenue = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const outstanding = invoices.filter((i) => i.status === 'Unpaid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const activeProjects = projects.filter((p) => p.status !== 'Completed').length;
  const wonLeads = leads.filter((l) => l.status === 'Won').length;
  const conversion = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;

  // ── Task distribution by status ────────────────────────────────────────────
  const taskByStatus = useMemo(() => {
    const counts = {};
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: STATUS_TONES[label] || '#94a3b8',
    }));
  }, [tasks]);

  // ── Tasks by department ────────────────────────────────────────────────────
  const taskByDept = useMemo(() => {
    const counts = {};
    tasks.forEach((t) => {
      const d = t.department || 'Other';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label: label.split(' ')[0], value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tasks]);

  // ── Lead pipeline ──────────────────────────────────────────────────────────
  const leadPipeline = useMemo(() => {
    const order = ['Lead', 'Qualified', 'Proposal Sent', 'Won'];
    const counts = {};
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return order
      .filter((s) => counts[s])
      .map((label) => ({ label: label.split(' ')[0], value: counts[label] }));
  }, [leads]);

  const handleExport = () => {
    exportCsv(
      'analytics_revenue',
      revenueSeries.map((r) => ({ month: r.label, revenue: r.value })),
      [
        { key: 'month', label: 'Month' },
        { key: 'revenue', label: 'Revenue' },
      ]
    );
    toast.success('Revenue report exported');
  };

  const hasData = invoices.length || tasks.length || leads.length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PieChart}
        title="Analytics"
        subtitle="Cross-module performance at a glance"
        actions={
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>
            Export
          </Button>
        }
      />

      {!hasData ? (
        <Card className="p-6">
          <EmptyState
            icon={PieChart}
            title="No data yet"
            message="Once you add invoices, tasks and leads, analytics will populate here automatically."
          />
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CreditCard} tone="emerald" label="Paid Revenue" value={fmtCurrency(totalRevenue)}>
              <Sparkline data={revenueSeries.map((r) => r.value)} color="#34d399" width={180} />
            </StatCard>
            <StatCard icon={Wallet} tone="amber" label="Outstanding" value={fmtCurrency(outstanding)} />
            <StatCard icon={Briefcase} tone="violet" label="Active Projects" value={activeProjects} />
            <StatCard icon={Users} tone="sky" label="Lead Conversion" value={`${conversion}%`} trendLabel={`${wonLeads}/${leads.length} won`} />
          </div>

          {/* Revenue trend */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">Revenue Trend</h3>
              <span className="text-xs text-slate-500">Last 6 months</span>
            </div>
            <LineChart data={revenueSeries} color="#d946ef" formatValue={(n) => fmtCurrency(n)} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task status donut */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-400" /> Task Status
              </h3>
              {taskByStatus.length ? (
                <DonutChart data={taskByStatus} centerLabel="tasks" />
              ) : (
                <EmptyState title="No tasks" />
              )}
            </Card>

            {/* Lead pipeline */}
            <Card className="p-6">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Lead Pipeline</h3>
              {leadPipeline.length ? (
                <BarChart data={leadPipeline} color="#38bdf8" />
              ) : (
                <EmptyState title="No leads" />
              )}
            </Card>
          </div>

          {/* Tasks by department */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4">Workload by Department</h3>
            {taskByDept.length ? (
              <BarChart data={taskByDept} color="#a78bfa" />
            ) : (
              <EmptyState title="No department tasks" />
            )}
          </Card>

          <p className="text-[0.7rem] text-slate-500 text-center">
            {clients.length} clients · {employees.length} team members · data as of {fmtDate(new Date())}
          </p>
        </>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Shield, CreditCard, Users, Briefcase, FileText, Download, Wallet } from 'lucide-react';
import { useToast } from './shared/Toast';
import { PageHeader, StatCard, Card, EmptyState, LineChart, Sparkline } from './ui';
import DepartmentReports from './shared/DepartmentReports';
import { exportCsv } from '../lib/exportCsv';
import { fmtCurrency, fmtDateTime } from '../lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function FounderDashboard({ state }) {
  const toast = useToast();
  const { employees, clients, invoices, devProjects, timelogs, auditLogs } = state;

  const totalWonRevenue = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const outstandingRevenue = invoices
    .filter((i) => i.status === 'Unpaid')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const activeProjectsCount = devProjects.filter((p) => p.status !== 'Completed').length;

  const getHoursLogged = (empId) =>
    timelogs.filter((log) => log.employeeId === empId).reduce((sum, c) => sum + (c.hours || 0), 0);

  // ── Real revenue series (paid invoices, last 6 months) ─────────────────────
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

  const exportReport = (type) => {
    if (type === 'timelogs') {
      const rows = timelogs.map((log) => ({
        employee: employees.find((e) => e.id === log.employeeId)?.name || 'Staff',
        date: log.date,
        hours: log.hours,
        description: log.description,
      }));
      exportCsv('DB_Timelog_Report', rows, [
        { key: 'employee', label: 'Employee' },
        { key: 'date', label: 'Date' },
        { key: 'hours', label: 'Hours' },
        { key: 'description', label: 'Description' },
      ]);
    } else if (type === 'invoices') {
      exportCsv('DB_Invoice_Report', invoices, [
        { key: 'id', label: 'Invoice ID' },
        { key: 'clientId', label: 'Client' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
      ]);
    } else {
      exportCsv('DB_Leads_Report', state.leads, [
        { key: 'id', label: 'Lead ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'budget', label: 'Budget' },
        { key: 'source', label: 'Source' },
        { key: 'status', label: 'Status' },
      ]);
    }
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Founder Executive Center"
        subtitle="Financial summaries, productivity matrices, and system audit logs"
        actions={
          <span className="hidden sm:flex items-center gap-2 text-xs bg-fuchsia-500/10 text-fuchsia-400 px-3.5 py-1.5 rounded-full border border-fuchsia-500/20 font-semibold">
            <Shield className="w-4 h-4" /> Master Access
          </span>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} tone="emerald" label="Paid Revenue" value={fmtCurrency(totalWonRevenue)}>
          <Sparkline data={revenueSeries.map((r) => r.value)} color="#34d399" width={180} />
        </StatCard>
        <StatCard icon={Wallet} tone="amber" label="Outstanding Backlog" value={fmtCurrency(outstandingRevenue)} />
        <StatCard icon={Briefcase} tone="fuchsia" label="Active Campaigns" value={activeProjectsCount} />
        <StatCard icon={Users} tone="sky" label="Customer Retainers" value={clients.length} />
      </div>

      {/* Revenue chart + exports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200">Monthly Billing Revenue</h3>
            <span className="text-xs text-slate-500">Paid invoices · last 6 months</span>
          </div>
          {invoices.some((i) => i.status === 'Paid') ? (
            <LineChart data={revenueSeries} color="#d946ef" formatValue={(n) => fmtCurrency(n)} />
          ) : (
            <EmptyState icon={CreditCard} title="No paid invoices yet" message="Revenue trend appears once invoices are marked paid." />
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Export Reports</h3>
          <p className="text-xs text-slate-400">Download formatted CSV files of core records.</p>
          <div className="space-y-3">
            {[
              ['timelogs', 'Timesheets', 'text-violet-400'],
              ['invoices', 'Invoices ledger', 'text-fuchsia-400'],
              ['leads', 'Leads pipeline', 'text-emerald-400'],
            ].map(([type, label, tone]) => (
              <button
                key={type}
                onClick={() => exportReport(type)}
                className="w-full glass-card glass-card-interactive p-3.5 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-between"
              >
                <span>{label} (.csv)</span>
                <Download className={`w-4 h-4 ${tone}`} />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Productivity + audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Team Performance Hours</h3>
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {employees.length === 0 ? (
              <EmptyState title="No team members" />
            ) : (
              employees.map((emp) => {
                const hrs = getHoursLogged(emp.id);
                return (
                  <div key={emp.id} className="glass-card p-3.5 rounded-xl flex items-center justify-between">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-200 truncate">{emp.name}</h4>
                      <p className="text-2xs text-slate-400 truncate">{emp.designation}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                        hrs > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {hrs.toFixed(1)}h
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-violet-400" /> System Audit Trail
          </h3>
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <EmptyState icon={FileText} title="No activity logged yet" />
            ) : (
              auditLogs.map((log) => {
                const u = employees.find((e) => e.id === log.userId);
                return (
                  <div
                    key={log.id}
                    className="p-3.5 glass-card rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-slate-200">
                        [{log.action}] <span className="font-normal text-slate-300">{log.details}</span>
                      </div>
                      <div className="text-2xs text-slate-500">By: {u ? u.name : 'System/Admin'}</div>
                    </div>
                    <span className="text-2xs text-slate-500 flex-shrink-0">{fmtDateTime(log.timestamp)}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Department reports */}
      <Card className="p-6">
        <DepartmentReports state={state} />
      </Card>
    </div>
  );
}

import React from 'react';
import { Shield, CreditCard, Users, Briefcase, FileText, Download, TrendingUp } from 'lucide-react';
import { useToast } from './shared/Toast';

export default function FounderDashboard({ state }) {
  const toast = useToast();
  const { employees, clients, invoices, devProjects, timelogs, auditLogs } = state;

  const totalWonRevenue = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const outstandingRevenue = invoices
    .filter(i => i.status === 'Unpaid')
    .reduce((sum, i) => sum + i.amount, 0);

  const activeProjectsCount = devProjects.filter(p => p.status !== 'Completed').length;

  const getHoursLogged = (empId) => {
    return timelogs
      .filter(log => log.employeeId === empId)
      .reduce((sum, current) => sum + current.hours, 0);
  };

  const exportCSV = (type) => {
    let csv = '';
    let filename = '';

    if (type === 'timelogs') {
      csv = 'Employee,Date,Hours,Description\n';
      timelogs.forEach(log => {
        const emp = employees.find(e => e.id === log.employeeId);
        csv += `"${emp?.name || 'Staff'}","${log.date}",${log.hours},"${log.description}"\n`;
      });
      filename = 'DB_Timelog_Report.csv';
    } else if (type === 'invoices') {
      csv = 'Invoice ID,Client,Due Date,Amount,Status\n';
      invoices.forEach(inv => {
        csv += `"${inv.id}","${inv.clientId}","${inv.dueDate}",${inv.amount},"${inv.status}"\n`;
      });
      filename = 'DB_Invoice_Report.csv';
    } else {
      csv = 'Lead ID,Name,Email,Phone,Budget,Source,Status\n';
      state.leads.forEach(ld => {
        csv += `"${ld.id}","${ld.name}","${ld.email}","${ld.phone}",${ld.budget},"${ld.source}","${ld.status}"\n`;
      });
      filename = 'DB_Leads_Report.csv';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    toast.success(`${filename} downloaded`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 font-heading tracking-tight">
            Founder Executive Center
          </h2>
          <p className="text-sm text-slate-400">High-level financial summaries, productivity matrices, and system audit logs.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-fuchsia-500/10 text-fuchsia-400 px-3.5 py-1.5 rounded-full border border-fuchsia-500/20 font-semibold font-mono">
          <Shield className="w-4 h-4" /> MASTER PERMISSION SYSTEM
        </div>
      </div>

      {/* Founder KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-violet-500">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Invoice Revenue</p>
            <h3 className="text-2xl font-bold mt-1 text-glow text-slate-100">₹{totalWonRevenue.toLocaleString()}</h3>
            <p className="text-3xs text-emerald-400 mt-0.5">Paid invoices</p>
          </div>
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Outstanding Backlog</p>
            <h3 className="text-2xl font-bold mt-1 text-glow text-slate-100">₹{outstandingRevenue.toLocaleString()}</h3>
            <p className="text-3xs text-amber-450 mt-0.5">Unpaid bills</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-450">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active PM Campaigns</p>
            <h3 className="text-2xl font-bold mt-1 text-glow text-slate-100">{activeProjectsCount} Boards</h3>
            <p className="text-3xs text-slate-550 mt-0.5">In Progress/Sprints</p>
          </div>
          <div className="p-3 bg-fuchsia-500/10 rounded-xl text-fuchsia-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Customer Retainers</p>
            <h3 className="text-2xl font-bold mt-1 text-glow text-slate-100">{clients.length} Profiles</h3>
            <p className="text-3xs text-slate-500 mt-0.5">CRM database size</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle row: SVG financial graph & Export Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SVG Invoice Revenue Area Chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">
            Monthly Billing Revenue Realization (₹ Lakhs)
          </h3>
          <div className="h-60 w-full flex items-center justify-center">
            <svg className="w-full h-full animate-fade-in" viewBox="0 0 400 200">
              <line x1="40" y1="30" x2="380" y2="30" stroke="#1e1b4b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="95" x2="380" y2="95" stroke="#1e1b4b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="160" x2="380" y2="160" stroke="#1e1b4b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="175" x2="380" y2="175" stroke="#312e81" strokeWidth="1.5" />

              {/* Path area plot */}
              <path
                d="M 60 160 Q 140 120 220 80 T 340 50 L 340 175 L 60 175 Z"
                fill="url(#areaGrad)"
                stroke="none"
              />
              <path
                d="M 60 160 Q 140 120 220 80 T 340 50"
                fill="none"
                stroke="#d946ef"
                strokeWidth="3"
              />

              <circle cx="60" cy="160" r="4.5" fill="#a78bfa" />
              <circle cx="200" cy="95" r="4.5" fill="#a78bfa" />
              <circle cx="340" cy="50" r="4.5" fill="#a78bfa" />

              <text x="60" y="195" fill="#64748b" fontSize="9" textAnchor="middle">Q1</text>
              <text x="200" y="195" fill="#64748b" fontSize="9" textAnchor="middle">Q2</text>
              <text x="340" y="195" fill="#64748b" fontSize="9" textAnchor="middle">Q3 (Est)</text>

              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d946ef" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Data Exports Panel */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">
            Export Reports Hub
          </h3>
          <p className="text-xs text-slate-400">Generate and download raw database files directly as formatted CSV files.</p>

          <div className="space-y-3">
            <button
              onClick={() => exportCSV('timelogs')}
              className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>Download Timesheets (.csv)</span>
              <Download className="w-4 h-4 text-violet-400" />
            </button>
            <button
              onClick={() => exportCSV('invoices')}
              className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>Download Invoices ledger (.csv)</span>
              <Download className="w-4 h-4 text-fuchsia-400" />
            </button>
            <button
              onClick={() => exportCSV('leads')}
              className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <span>Download Leads pipeline (.csv)</span>
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Employee Productivity Matrix & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Productivity list */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">
            Team Performance Hours
          </h3>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {employees.map(emp => {
              const hrs = getHoursLogged(emp.id);
              return (
                <div key={emp.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{emp.name}</h4>
                    <p className="text-3xs text-slate-400">{emp.designation}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-xl font-bold font-mono ${
                    hrs > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {hrs.toFixed(1)} Hrs
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Monitor logs */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-violet-400" /> System Audit Trail Monitor
          </h3>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {auditLogs.map(log => {
              const user = employees.find(e => e.id === log.userId);
              return (
                <div key={log.id} className="p-3.5 bg-slate-950/45 border border-slate-900/60 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">
                      [{log.action}] <span className="font-normal text-slate-300">{log.details}</span>
                    </div>
                    <div className="text-3xs text-slate-500">Performed by: {user ? user.name : 'System/Admin'}</div>
                  </div>
                  <span className="text-3xs text-slate-450 font-mono flex-shrink-0">{log.timestamp}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

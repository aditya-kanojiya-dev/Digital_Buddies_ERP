import { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, ListTodo, BarChart3 } from 'lucide-react';
import { today, addDays } from '../../lib/format';

const DEPTS = [
  'Social Media', 'Paid Ads', 'Video Editors', 'Graphic Designers',
  'Videography/Photography', 'Developers',
];

const PERIODS = {
  weekly:  { label: 'This Week',    days: 7 },
  monthly: { label: 'This Month',   days: 30 },
};

function getDateRange(period) {
  const end = today();
  const days = PERIODS[period].days;
  const start = addDays(end, -days + 1);
  return { start, end };
}

function isInRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}

export default function DepartmentReports({ state }) {
  const { employees, tasks, timelogs } = state;
  const [activeDept, setActiveDept] = useState(DEPTS[0]);
  const [period, setPeriod] = useState('weekly');

  const { start, end } = getDateRange(period);
  const todayStr = today();

  const deptEmployees = useMemo(
    () => employees.filter(e => e.department?.includes(activeDept)),
    [employees, activeDept]
  );

  const employeeStats = useMemo(() => {
    return deptEmployees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id);
      const empLogs = timelogs.filter(l => l.employeeId === emp.id);

      // Tasks due in this period
      const dueInPeriod = empTasks.filter(t => t.dueDate && isInRange(t.dueDate, start, end));
      const completed = dueInPeriod.filter(t => t.status === 'Completed').length;
      const pending   = dueInPeriod.filter(t => ['New', 'In Progress', 'Review'].includes(t.status)).length;
      const overdue   = empTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr).length;
      const totalDue  = dueInPeriod.length;

      // Timelogs in this period
      const logsInPeriod = empLogs.filter(l => l.date && isInRange(l.date, start, end));
      const totalHours = logsInPeriod.reduce((sum, l) => sum + (l.hours || 0), 0);

      // Delay count (tasks with delays reported)
      const delayed = empTasks.filter(t => t.isDelayed && t.delayCount > 0).length;

      return {
        emp,
        totalDue,
        completed,
        pending,
        overdue,
        totalHours,
        delayed,
      };
    });
  }, [deptEmployees, tasks, timelogs, start, end, todayStr]);

  // Dept-level aggregates
  const totals = useMemo(() => ({
    employees:   employeeStats.length,
    totalDue:    employeeStats.reduce((s, e) => s + e.totalDue, 0),
    completed:   employeeStats.reduce((s, e) => s + e.completed, 0),
    pending:     employeeStats.reduce((s, e) => s + e.pending, 0),
    overdue:     employeeStats.reduce((s, e) => s + e.overdue, 0),
    totalHours:  employeeStats.reduce((s, e) => s + e.totalHours, 0),
    delayed:     employeeStats.reduce((s, e) => s + e.delayed, 0),
  }), [employeeStats]);

  return (
    <div className="space-y-5">
      {/* Period toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-fuchsia-400" /> Department Reports
        </h3>
        <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
          {Object.entries(PERIODS).map(([key, { label }]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                period === key ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range badge */}
      <p className="text-xs text-slate-500">
        {start} — {end}
      </p>

      {/* Dept tabs */}
      <div className="flex gap-1 flex-wrap">
        {DEPTS.map(d => (
          <button key={d} onClick={() => setActiveDept(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeDept === d ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-slate-900/40 border border-slate-800'
            }`}>
            {d === 'Videography/Photography' ? 'Videography' : d}
          </button>
        ))}
      </div>

      {/* Dept summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Members',     totals.employees,  'text-sky-400'],
          ['Tasks Due',   totals.totalDue,    'text-violet-400'],
          ['Completed',   totals.completed,   'text-emerald-400'],
          ['Pending',     totals.pending,     'text-amber-400'],
          ['Overdue',     totals.overdue,     'text-rose-400'],
          ['Total Hours', totals.totalHours?.toFixed(1), 'text-fuchsia-400'],
        ].map(([label, value, tone]) => (
          <div key={label} className="glass-card p-3 rounded-xl text-center">
            <p className={`text-lg font-extrabold ${tone}`}>{value}</p>
            <p className="text-3xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Employee cards */}
      {employeeStats.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">No employees in this department.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeeStats.map(({ emp, totalDue, completed, pending, overdue, totalHours, delayed }) => (
            <div key={emp.id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                  {emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-200 truncate">{emp.name}</h4>
                  <p className="text-3xs text-slate-500 truncate">{emp.designation || emp.role}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  [totalDue,  'Due',    'text-violet-400'],
                  [completed, 'Done',   'text-emerald-400'],
                  [pending,   'Active', 'text-amber-400'],
                ].map(([val, lbl, tone]) => (
                  <div key={lbl} className="text-center p-2 rounded-lg bg-slate-900/40">
                    <p className={`text-sm font-bold ${tone}`}>{val}</p>
                    <p className="text-3xs text-slate-500">{lbl}</p>
                  </div>
                ))}
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1 ${overdue > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                  <AlertTriangle className="w-3 h-3" /> {overdue} overdue
                </span>
                <span className={`flex items-center gap-1 ${delayed > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  <Clock className="w-3 h-3" /> {delayed} delayed
                </span>
                <span className="flex items-center gap-1 text-fuchsia-400 font-bold">
                  <Clock className="w-3 h-3" /> {totalHours.toFixed(1)}h
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

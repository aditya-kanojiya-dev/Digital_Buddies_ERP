import { Download } from 'lucide-react';

export default function TimesheetAudit({
  employees,
  timelogs,
  tasks,
  handleExportTimelogs,
}) {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Timesheet Audit Ledger</h3>
          <p className="text-xs text-slate-400">View and audit all hours logged by team members against task contexts.</p>
        </div>
        <button
          onClick={handleExportTimelogs}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export Timesheets (.csv)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase">
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Task Reference</th>
              <th className="py-3 px-4">Date Logged</th>
              <th className="py-3 px-4">Hours Logged</th>
              <th className="py-3 px-4">Work Description Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-300">
            {timelogs.map(log => {
              const emp = employees.find(e => e.id === log.employeeId);
              const task = tasks.find(t => t.id === log.taskId);
              return (
                <tr key={log.id} className="hover:bg-slate-900/20">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{emp?.name || 'Staff'}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-violet-400">{task?.title || 'General Activity'}</td>
                  <td className="py-3.5 px-4">{log.date}</td>
                  <td className="py-3.5 px-4 font-mono font-bold">{log.hours} Hrs</td>
                  <td className="py-3.5 px-4 text-slate-400 italic line-clamp-1">"{log.description}"</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

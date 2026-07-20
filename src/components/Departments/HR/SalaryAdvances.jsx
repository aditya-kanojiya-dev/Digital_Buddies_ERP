import { DollarSign, Check, X, Printer } from 'lucide-react';

export default function SalaryAdvances({
  employees,
  advances,
  advEmpId, setAdvEmpId,
  advAmount, setAdvAmount,
  advReason, setAdvReason,
  handleRequestAdvance,
  handleUpdateAdvanceStatus,
  getEmployeePayrollDetails,
  setSelectedPayslipEmp,
}) {
  return (
    <div className="space-y-6 print:hidden">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Payroll', count: `\u20B9${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pending Advances', count: advances.filter(a => a.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Approved Advances', count: advances.filter(a => a.status === 'Approved').length, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Total Advances', count: `\u20B9${advances.filter(a => a.status === 'Approved').reduce((s, a) => s + a.amount, 0).toLocaleString()}`, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-slate-800/40`}>
            <p className="text-3xs text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.count}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Advance Salary Requests</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center col-span-2 border border-dashed border-slate-800/60 rounded-xl">
              <DollarSign className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No advance requests logged yet.</p>
            </div>
          ) : (
            advances.map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              return (
                <div key={a.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-200">{emp ? emp.name : 'Unknown Staff'}</div>
                    <div className="text-xs text-slate-400">Request: \u20B9{a.amount.toLocaleString()} on {a.date}</div>
                    <div className="text-xs text-slate-500">Reason: "{a.reason}"</div>
                  </div>

                  <div className="flex gap-1">
                    {a.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleUpdateAdvanceStatus(a.id, 'Approved')}
                          className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateAdvanceStatus(a.id, 'Rejected')}
                          className="p-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded transition"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {a.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleRequestAdvance} className="border-t border-slate-900 pt-6 space-y-4">
          <h4 className="font-bold text-sm text-slate-300">Create Advance Request Form</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Employee Profile</label>
              <select
                value={advEmpId}
                onChange={(e) => setAdvEmpId(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-xs"
                required
              >
                <option value="">-- Choose Member --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Request Amount (\u20B9)</label>
              <input
                type="number"
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-xs"
                placeholder="10000"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Deduction Reason</label>
              <input
                type="text"
                value={advReason}
                onChange={(e) => setAdvReason(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-xs"
                placeholder="House rent prepayment..."
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
          >
            Log Request
          </button>
        </form>
      </div>

      {/* Salary Event Logic Ledger */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
          <span>Salary Ledger (Total Salary Calculation)</span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Base</th>
                <th className="py-2.5 px-4 text-rose-400">Leave Ded.</th>
                <th className="py-2.5 px-4 text-amber-500">Advance Ded.</th>
                <th className="py-2.5 px-4 text-emerald-400 font-bold">Total Payout</th>
                <th className="py-2.5 px-4 text-right">Reciept</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {employees.map(emp => {
                const pay = getEmployeePayrollDetails(emp);
                return (
                  <tr key={emp.id} className="text-slate-300 text-xs hover:bg-slate-900/25">
                    <td className="py-3 px-4 font-semibold text-slate-200">{emp.name}</td>
                    <td className="py-3 px-4 font-mono">\u20B9{pay.base.toLocaleString()}</td>
                    <td className="py-3 px-4 text-rose-400 font-mono">-\u20B9{pay.leaveDeduction.toLocaleString()}</td>
                    <td className="py-3 px-4 text-amber-500 font-mono">-\u20B9{pay.advancesDeduction.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold font-mono text-sm">
                      \u20B9{pay.totalSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayslipEmp(emp)}
                        className="bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 px-3 py-1.5 rounded-xl border border-violet-500/20 transition flex items-center gap-1.5 ml-auto text-xs cursor-pointer font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" /> Payslip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

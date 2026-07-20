import { Plus, ShieldCheck, Activity } from 'lucide-react';

export default function SecurityOps({
  dailyOps,
  updateState,
  escrows, setEscrows,
  escrowOpen, setEscrowOpen,
  escrowName, setEscrowName,
  escrowAmount, setEscrowAmount,
  newOpsText, setNewOpsText,
  handleAddEscrow,
  handleToggleEscrow,
  handleAddOps,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Payment Security & Escrows</h3>
          <button onClick={() => setEscrowOpen(true)}
            className="p-1.5 hover:bg-fuchsia-500/15 rounded text-fuchsia-400 transition cursor-pointer" title="Add Escrow">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {escrowOpen && (
          <form onSubmit={handleAddEscrow} className="glass-card p-4 rounded-xl space-y-3 border border-fuchsia-500/20">
            <input type="text" value={escrowName} onChange={e => setEscrowName(e.target.value)}
              className="w-full glass-input p-2.5 rounded-xl text-xs" placeholder="Project / Milestone name" required />
            <div className="flex gap-2">
              <input type="number" value={escrowAmount} onChange={e => setEscrowAmount(e.target.value)}
                className="flex-1 glass-input p-2.5 rounded-xl text-xs font-mono" placeholder="Amount (\u20B9)" required />
              <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-700 px-3 rounded-xl text-xs font-bold text-white transition cursor-pointer">Add</button>
              <button type="button" onClick={() => setEscrowOpen(false)} className="bg-slate-800 hover:bg-slate-700 px-3 rounded-xl text-xs text-slate-300 transition cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {escrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No escrow entries yet.</p>
            </div>
          ) : escrows.map(esc => (
            <div key={esc.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-200">{esc.name}</div>
                <div className="text-xs text-slate-400">Budget Escrow: \u20B9{esc.amount.toLocaleString()}</div>
              </div>
              <button onClick={() => handleToggleEscrow(esc.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                  esc.status === 'Verified'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                }`}>
                {esc.status === 'Verified' ? 'Verified' : 'Pending Verification'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-semibold text-slate-100">Daily Operations Checklist</h3>

        <form onSubmit={handleAddOps} className="flex items-center gap-2">
          <input type="text" value={newOpsText} onChange={e => setNewOpsText(e.target.value)}
            className="flex-1 glass-input p-2.5 rounded-xl text-xs" placeholder="New operation task..." required />
          <button type="submit" className="bg-violet-600 hover:bg-violet-700 px-3 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>

        <div className="space-y-3">
          {dailyOps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
              <Activity className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No operations logged yet.</p>
            </div>
          ) : dailyOps.map(op => (
            <div key={op.id} className="flex items-center gap-3 p-3 bg-slate-950/45 rounded-xl border border-slate-900">
              <input
                type="checkbox"
                checked={op.status === 'Completed'}
                onChange={() => {
                  const updated = dailyOps.map(item => {
                    if (item.id === op.id) {
                      return { ...item, status: item.status === 'Completed' ? 'Pending' : 'Completed' };
                    }
                    return item;
                  });
                  updateState({ dailyOps: updated });
                }}
                className="w-4.5 h-4.5 border-slate-800 rounded accent-violet-600 focus:ring-0 cursor-pointer"
              />
              <span className={`text-sm ${op.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {op.task}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

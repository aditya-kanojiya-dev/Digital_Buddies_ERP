import { ClockAlert } from 'lucide-react';

export default function DelayReportModal({
  delayTaskId, setDelayTaskId,
  delayReason, setDelayReason,
  delayNewDueDate, setDelayNewDueDate,
  handleReportDelay,
  tasks,
}) {
  if (!delayTaskId) return null;
  const task = tasks.find(t => t.id === delayTaskId);
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => { setDelayTaskId(null); setDelayReason(''); setDelayNewDueDate(''); }} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-rose-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <ClockAlert className="w-5 h-5 text-rose-400" />
            Report Delay
          </h3>
          <p className="text-sm text-slate-400">
            Task <span className="text-slate-200 font-semibold">"{task?.title}"</span> was due on{' '}
            <span className="text-rose-400 font-semibold">{task?.dueDate}</span>. Provide a reason and a new due date.
          </p>
          <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3">
            <p className="text-3xs text-rose-300/80 leading-relaxed">
              The assigner will be notified and this delay will be recorded in the audit log.
            </p>
          </div>
          <form onSubmit={handleReportDelay} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">New Due Date</label>
              <input type="date" value={delayNewDueDate} onChange={e => setDelayNewDueDate(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Reason for Delay *</label>
              <textarea value={delayReason} onChange={e => setDelayReason(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm h-28 resize-none"
                placeholder="e.g. Client feedback delayed revision approval, additional shoot required due to weather, scope creep from client changes..."
                maxLength={500} required autoFocus />
              <p className="text-3xs text-slate-500 text-right mt-1">{delayReason.length}/500</p>
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-500 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-all duration-150 flex items-center justify-center gap-2">
                <ClockAlert className="w-4 h-4" /> Submit Delay Report
              </button>
              <button type="button"
                onClick={() => { setDelayTaskId(null); setDelayReason(''); setDelayNewDueDate(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

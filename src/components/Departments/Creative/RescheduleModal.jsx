import { CalendarClock } from 'lucide-react';

export default function RescheduleModal({
  rescheduleTaskId, setRescheduleTaskId,
  rescheduleDate, setRescheduleDate,
  rescheduleReason, setRescheduleReason,
  handleReschedule,
  tasks,
}) {
  if (!rescheduleTaskId) return null;
  const task = tasks.find(t => t.id === rescheduleTaskId);
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => { setRescheduleTaskId(null); setRescheduleDate(''); setRescheduleReason(''); }} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-amber-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-400" />
            Request Reschedule
          </h3>
          <p className="text-sm text-slate-400">
            Propose a new date for <span className="text-slate-200 font-semibold">"{task?.title}"</span>.
            The Social Media team will be notified.
          </p>
          <form onSubmit={handleReschedule} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Proposed New Date</label>
              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Reason for Reschedule</label>
              <textarea value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm h-24 resize-none"
                placeholder="e.g. Venue not available, conflicting shoot, weather issue..."
                maxLength={300} required />
              <p className="text-3xs text-slate-500 text-right mt-1">{rescheduleReason.length}/300</p>
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-500 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition-all duration-150 flex items-center justify-center gap-2">
                <CalendarClock className="w-4 h-4" /> Send Reschedule
              </button>
              <button type="button"
                onClick={() => { setRescheduleTaskId(null); setRescheduleDate(''); setRescheduleReason(''); }}
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

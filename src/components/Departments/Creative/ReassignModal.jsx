import { RefreshCw } from 'lucide-react';

export default function ReassignModal({
  reassignTaskId, setReassignTaskId,
  reassignEmpId, setReassignEmpId,
  handleReassignSubmit,
  tasks, employees, activeDepartment,
}) {
  if (!reassignTaskId) return null;
  const task = tasks.find(t => t.id === reassignTaskId);
  const taskDeptStaff = employees.filter(e => e.department?.includes(task?.department || activeDepartment));
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => { setReassignTaskId(null); setReassignEmpId(''); }} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-violet-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-violet-400" />
            Reassign Task
          </h3>
          <p className="text-sm text-slate-400">
            Reassign <span className="text-slate-200 font-semibold">"{task?.title}"</span> to a different team member.
          </p>
          <form onSubmit={(e) => handleReassignSubmit(e, reassignTaskId)} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Assign to</label>
              <select value={reassignEmpId} onChange={e => setReassignEmpId(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                <option value="">— Choose member —</option>
                {taskDeptStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-violet-600 hover:bg-violet-500 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition-all duration-150 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Reassign
              </button>
              <button type="button"
                onClick={() => { setReassignTaskId(null); setReassignEmpId(''); }}
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

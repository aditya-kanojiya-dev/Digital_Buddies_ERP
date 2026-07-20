import { Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({
  deleteTaskId, setDeleteTaskId,
  handleDeleteTask,
  tasks,
}) {
  if (!deleteTaskId) return null;
  const task = tasks.find(t => t.id === deleteTaskId);
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setDeleteTaskId(null)} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-rose-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-sm max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            Delete Task
          </h3>
          <p className="text-sm text-slate-400">
            Delete <span className="text-slate-200 font-semibold">"{task?.title}"</span> permanently? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleDeleteTask(deleteTaskId)}
              className="flex-1 bg-rose-600 hover:bg-rose-500 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-rose-500/20 transition-all duration-150 flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={() => setDeleteTaskId(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

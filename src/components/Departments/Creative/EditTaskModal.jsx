import { Edit3, CheckCircle } from 'lucide-react';

export default function EditTaskModal({
  editTaskId, setEditTaskId,
  editTitle, setEditTitle,
  editPriority, setEditPriority,
  editDue, setEditDue,
  editAssignee, setEditAssignee,
  handleSaveEdit,
  tasks, employees,
}) {
  if (!editTaskId) return null;
  const task = tasks.find(t => t.id === editTaskId);
  const taskDeptStaff = employees.filter(e => e.department?.includes(task?.department || ''));
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setEditTaskId(null)} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
        <div className="glass-panel border border-blue-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
          onClick={e => e.stopPropagation()}>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-400" />
            Edit Task
          </h3>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Task Name</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Priority</label>
              <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Assign to</label>
              <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                <option value="">— Choose member —</option>
                {taskDeptStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Due Date</label>
              <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Save Changes
              </button>
              <button type="button" onClick={() => setEditTaskId(null)}
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

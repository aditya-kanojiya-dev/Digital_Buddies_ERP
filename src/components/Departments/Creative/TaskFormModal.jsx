import { Plus, X, AlertCircle } from 'lucide-react';
import { DatePicker } from '../../ui';

export default function TaskFormModal({
  showTaskForm, setShowTaskForm,
  canAssignTasks, handleAddTask,
  taskTitle, setTaskTitle,
  priority, setPriority,
  daysPrior, setDaysPrior,
  subTypeFilter, setSubTypeFilter,
  assigneeId, setAssigneeId,
  needsBothRoles, setNeedsBothRoles,
  coAssigneeId, setCoAssigneeId,
  scheduledDate, setScheduledDate,
  attachmentUrl, setAttachmentUrl,
  creativeStaff, coAssigneeStaff,
  activeDepartment, tasks,
  getWorkloadInfo, formatWorkloadLabel,
  addDays, todayStr,
}) {
  if (!showTaskForm) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
      onClick={() => setShowTaskForm(false)}>
      <div className="glass-panel border border-fuchsia-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[85vh] md:max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-800">
          <h3 className="font-bold text-slate-100 text-sm">New Task</h3>
          <button onClick={() => setShowTaskForm(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 md:p-5">
        {canAssignTasks ? (
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Task Name</label>
              <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="e.g. Aura Serum Instagram Ad V1" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Priority</label>
              <select value={priority} onChange={e => {
                setPriority(e.target.value);
                if (e.target.value === 'Emergency') setDaysPrior('0');
                else if (daysPrior === '0' || daysPrior === '1' || daysPrior === '2') setDaysPrior('3');
              }}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Timeline</label>
              {priority === 'Emergency' ? (
                <select value={daysPrior} onChange={e => setDaysPrior(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm">
                  <option value="0">Today (ASAP)</option>
                  <option value="1">Tomorrow (End of day)</option>
                  <option value="2">Day After Tomorrow</option>
                </select>
              ) : (
                <select value={daysPrior} onChange={e => setDaysPrior(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm">
                  <option value="3">3 Days from today</option>
                  <option value="4">4 Days from today</option>
                  <option value="5">5 Days from today</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Role Type</label>
              <select value={subTypeFilter} onChange={e => { setSubTypeFilter(e.target.value); setAssigneeId(''); setCoAssigneeId(''); setNeedsBothRoles(false); }}
                className="w-full glass-input p-2.5 rounded-xl text-sm">
                <option value="">All Roles</option>
                <option value="Videographer">Videographer</option>
                <option value="Content Creator">Content Creator / Influencer</option>
              </select>
            </div>
            {subTypeFilter && activeDepartment === 'Videography/Photography' && (
              <div className="flex items-center gap-3 px-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={needsBothRoles}
                    onChange={e => { setNeedsBothRoles(e.target.checked); if (!e.target.checked) setCoAssigneeId(''); }}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
                <span className="text-xs text-slate-400">Requires both roles?</span>
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Assign to</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                <option value="">— Choose member —</option>
                {creativeStaff.length === 0 && <option disabled>No {activeDepartment} staff found</option>}
                {creativeStaff.map(s => {
                  const dueDate = scheduledDate
                    ? addDays(scheduledDate, -parseInt(daysPrior))
                    : addDays(todayStr(), parseInt(daysPrior));
                  const info = getWorkloadInfo(tasks, s.id, dueDate, activeDepartment, priority);
                  const label = info ? formatWorkloadLabel(s.name, info.load, info.softMax, dueDate) : s.name;
                  return <option key={s.id} value={s.id} className={
                    info?.color === 'red' ? 'text-red-400' :
                    info?.color === 'amber' ? 'text-amber-400' : ''
                  }>{label}</option>;
                })}
              </select>
            </div>
            {needsBothRoles && coAssigneeStaff.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Co-Assignee ({subTypeFilter === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
                <select value={coAssigneeId} onChange={e => setCoAssigneeId(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                  <option value="">— Choose co-assignee —</option>
                  {coAssigneeStaff.map(s => {
                    const dueDate = scheduledDate
                      ? addDays(scheduledDate, -parseInt(daysPrior))
                      : addDays(todayStr(), parseInt(daysPrior));
                    const info = getWorkloadInfo(tasks, s.id, dueDate, activeDepartment, priority);
                    const label = info ? formatWorkloadLabel(s.name, info.load, info.softMax, dueDate) : s.name;
                    return <option key={s.id} value={s.id} className={
                      info?.color === 'red' ? 'text-red-400' :
                      info?.color === 'amber' ? 'text-amber-400' : ''
                    }>{label}</option>;
                  })}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <DatePicker label="Prior Date" value={scheduledDate} onChange={setScheduledDate} />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Attachment Link</label>
                <input type="url" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Drive / Figma URL" />
              </div>
            </div>
            <button type="submit" onClick={() => setShowTaskForm(false)}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-fuchsia-500/20 transition-all duration-150 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Queue Asset
            </button>
          </form>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-xs">Task assignment is restricted to Managers, Admins, and Social Media department</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

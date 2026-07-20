import { Send } from 'lucide-react';
import { DatePicker, Modal } from '../../ui';

export default function CrossDeptTaskModal({
  showTaskModal, setShowTaskModal,
  taskForm, setTaskForm,
  blankTask: getBlankTask,
  crossDeptSubType, setCrossDeptSubType,
  crossDeptNeedsBoth, setCrossDeptNeedsBoth,
  crossDeptCoAssignee, setCrossDeptCoAssignee,
  deptEmployees, crossDeptCoStaff,
  isVideographyTarget, isCreativeDept, rule,
  handleAssignTask,
  computeDueDate,
  tasks,
  getWorkloadInfo, formatWorkloadLabel,
  addDays, today,
}) {
  return (
    <Modal
      open={showTaskModal}
      title="Assign Task to Another Department"
      onClose={() => { setShowTaskModal(false); setTaskForm(getBlankTask()); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee(''); }}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
          <input type="text" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))}
            className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Create 3 reels for client campaign" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea value={taskForm.description} onChange={e=>setTaskForm(f=>({...f,description:e.target.value}))}
            className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Details, references, links..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Department *</label>
            <select value={taskForm.targetDept} onChange={e=>{setTaskForm(f=>({...f,targetDept:e.target.value,assignedTo:''})); setCrossDeptSubType('');}} className="w-full glass-input p-3 rounded-xl text-sm">
              {['Video Editors','Graphic Designers','Videography/Photography','Developers','Paid Ads'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          {isVideographyTarget ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role Type</label>
              <select value={crossDeptSubType} onChange={e=>{setCrossDeptSubType(e.target.value); setTaskForm(f=>({...f,assignedTo:''})); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee('');}} className="w-full glass-input p-3 rounded-xl text-sm">
                <option value="">All Roles</option>
                <option value="Videographer">Videographer</option>
                <option value="Content Creator">Content Creator / Influencer</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
              <select value={taskForm.assignedTo} onChange={e=>setTaskForm(f=>({...f,assignedTo:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
                <option value="">Whole department</option>
                {deptEmployees.map(e => {
                  const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
                  const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                  const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                  return <option key={e.id} value={e.id} className={
                    info?.color === 'red' ? 'text-red-400' :
                    info?.color === 'amber' ? 'text-amber-400' : ''
                  }>{label}</option>;
                })}
              </select>
            </div>
          )}
        </div>
        {isVideographyTarget && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
            <select value={taskForm.assignedTo} onChange={e=>setTaskForm(f=>({...f,assignedTo:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
              <option value="">Whole department</option>
              {deptEmployees.map(e => {
                const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
                const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                return <option key={e.id} value={e.id} className={
                  info?.color === 'red' ? 'text-red-400' :
                  info?.color === 'amber' ? 'text-amber-400' : ''
                }>{label}</option>;
              })}
            </select>
          </div>
        )}
        {isVideographyTarget && crossDeptSubType && (
          <div className="flex items-center gap-3 px-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={crossDeptNeedsBoth}
                onChange={e=>{setCrossDeptNeedsBoth(e.target.checked); if(!e.target.checked) setCrossDeptCoAssignee('');}}
                className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
            <span className="text-xs text-slate-400">Requires both roles?</span>
          </div>
        )}
        {crossDeptNeedsBoth && crossDeptCoStaff.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Co-Assignee ({crossDeptSubType === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
            <select value={crossDeptCoAssignee} onChange={e=>setCrossDeptCoAssignee(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm">
              <option value="">— Select co-assignee —</option>
              {crossDeptCoStaff.map(e => {
                const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
                const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                return <option key={e.id} value={e.id} className={
                  info?.color === 'red' ? 'text-red-400' :
                  info?.color === 'amber' ? 'text-amber-400' : ''
                }>{label}</option>;
              })}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Priority</label>
            <select value={taskForm.priority} onChange={e=>setTaskForm(f=>({...f,priority:e.target.value,timelineDays: e.target.value === 'Emergency' ? '0' : f.timelineDays}))} className="w-full glass-input p-3 rounded-xl text-sm">
              {['Low','Medium','High','Emergency'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          {taskForm.priority === 'Emergency' ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Completion Timeline</label>
              <select value={taskForm.timelineDays} onChange={e=>setTaskForm(f=>({...f,timelineDays:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl text-sm">
                <option value="0">Today (ASAP)</option>
                <option value="1">Tomorrow (End of day)</option>
                <option value="2">Day After Tomorrow</option>
              </select>
              <p className="text-3xs text-rose-400 mt-1 font-semibold">Due: {computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 })}</p>
            </div>
          ) : rule.mode === 'manual' ? (
            <div>
              <DatePicker label="Due Date" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({...f, dueDate: v}))} />
            </div>
          ) : rule.mode === 'select' ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Timeline</label>
              <select value={taskForm.timelineDays} onChange={e=>setTaskForm(f=>({...f,timelineDays:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl text-sm">
                {(rule.options || [3, 5]).map(d => (
                  <option key={d} value={d}>{d} Days from today</option>
                ))}
              </select>
              <p className="text-3xs text-slate-500 mt-1">Due: {addDays(today(), parseInt(taskForm.timelineDays || '3'))}</p>
            </div>
          ) : rule.mode === 'fixed' ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <p className="text-xs text-slate-300 mt-2">Auto: {addDays(today(), rule.days)} (fixed {rule.days} days)</p>
            </div>
          ) : (
            <div>
              <DatePicker label="Due Date" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({...f, dueDate: v}))} />
            </div>
          )}
        </div>
        {isCreativeDept && (
          <div>
            <DatePicker label="Prior Date" value={taskForm.scheduledDate} onChange={v => setTaskForm(f => ({...f, scheduledDate: v}))} />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={handleAssignTask}
            className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Send Task
          </button>
          <button onClick={() => { setShowTaskModal(false); setTaskForm(getBlankTask()); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee(''); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
            Cancel
          </button>
        </div>
        {deptEmployees.length === 0 && (
          <p className="text-xs text-slate-500 text-center">No employees found in {taskForm.targetDept} — task will be visible to that department when they check their workspace.</p>
        )}
      </div>
    </Modal>
  );
}

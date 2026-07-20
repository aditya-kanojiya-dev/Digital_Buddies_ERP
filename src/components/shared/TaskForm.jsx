import { useState, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useToast } from './Toast';
import { genId, today as todayStr, addDays, computeDueDate } from '../../lib/format';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { ALLOWED_TARGET_DEPTS, CREATIVE_DEPTS, DEPT_TIMELINE_RULES } from '../../lib/constants';
import { DatePicker } from '../ui';

/**
 * Shared task creation form used by ManagerDashboard, SocialMedia, and DeptCalendar.
 *
 * Props:
 *   sourceDept      string  required  Who is creating (e.g. "Social Media", "Work Assignment")
 *   targetDept      string  ''        Pre-selected target department
 *   showDescription boolean false     Show description textarea
 *   showAssignee    boolean true      Show assignee picker
 *   showProject     boolean true      Show project selector
 *   onSubmit        function required  Called with normalized task data object
 *   onCancel        function required  Close/reset handler
 *   employees       array   required  Employee list for assignee pickers
 *   tasks           array   required  Current tasks for workload cap checks
 *   projects        array   []        Project list for project picker
 *   currentUser     object  required  Current user for assignedBy
 */
export default function TaskForm({
  sourceDept,
  targetDept: initialTargetDept = '',
  showDescription = false,
  showAssignee = true,
  showProject = true,
  onSubmit,
  onCancel,
  employees,
  tasks = [],
  projects = [],
  currentUser,
}) {
  const toast = useToast();

  // ── Internal form state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDept, setTargetDept] = useState(initialTargetDept);
  const [assigneeId, setAssigneeId] = useState('');
  const [coAssigneeId, setCoAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [timelineDays, setTimelineDays] = useState('3');
  const [scheduledDate, setScheduledDate] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [needsBothRoles, setNeedsBothRoles] = useState(false);

  // ── Derived state ──
  const rule = DEPT_TIMELINE_RULES[targetDept] || {};
  const isVideographyDept = targetDept === 'Videography/Photography';
  const isCreativeDept = CREATIVE_DEPTS.includes(targetDept);

  const deptStaff = useMemo(() =>
    targetDept
      ? employees.filter(e =>
          e.department?.includes(targetDept) &&
          (!isVideographyDept || !subTypeFilter || e.subType === subTypeFilter)
        )
      : []
  , [employees, targetDept, isVideographyDept, subTypeFilter]);

  const coDeptStaff = useMemo(() =>
    needsBothRoles && isVideographyDept && subTypeFilter
      ? employees.filter(e =>
          e.department?.includes(targetDept) &&
          e.subType !== subTypeFilter &&
          e.id !== assigneeId
        )
      : []
  , [employees, targetDept, needsBothRoles, isVideographyDept, subTypeFilter, assigneeId]);

  const computedDueDate = computeDueDate({ priority, timelineDays, dueDate, rule, fallbackDays: 0 });

  // ── Submit handler ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Task title is required.'); return; }
    if (!targetDept) { toast.error('Target department is required.'); return; }

    const finalDueDate = computedDueDate;
    const assignee = assigneeId ? employees.find(emp => emp.id === assigneeId) : null;
    const coAssignee = needsBothRoles && coAssigneeId ? employees.find(emp => emp.id === coAssigneeId) : null;

    // ── Workload cap check ──
    if (assigneeId && finalDueDate && isCreativeDept) {
      const info = getWorkloadInfo(tasks, assigneeId, finalDueDate, targetDept, priority);
      if (!info.canAssign) { toast.error(info.reason); return; }
      if (info.reason && !info.reason.startsWith('⚠️')) { toast.warning(info.reason); }
    }
    if (coAssigneeId && finalDueDate && isCreativeDept) {
      const coInfo = getWorkloadInfo(tasks, coAssigneeId, finalDueDate, targetDept, priority);
      if (!coInfo.canAssign) { toast.error(`Co-assignee: ${coInfo.reason}`); return; }
    }

    const isVideography = targetDept === 'Videography/Photography';
    const now = new Date().toISOString();

    const taskData = {
      id:                `T${Date.now()}`,
      title:             title.trim(),
      description:       showDescription ? description.trim() : '',
      assignedTo:        assigneeId || null,
      assigneeName:      assignee?.name || '',
      assignedTo2:       coAssigneeId || null,
      assigneeName2:     coAssignee?.name || '',
      assignedBy:        currentUser.id,
      department:        targetDept,
      sourceDept:        sourceDept,
      projectId:         showProject ? (taskProject || 'General') : 'General',
      priority,
      status:            'New',
      dueDate:           finalDueDate || '',
      scheduledDate:     isCreativeDept && scheduledDate ? scheduledDate : null,
      createdAt:         now.split('T')[0],
      pinged:            0,
      lastPingedAt:      null,
      shootApprovalStatus: isVideography ? 'pending' : null,
    };

    onSubmit(taskData);

    // Reset form
    setTitle(''); setDescription(''); setAssigneeId(''); setCoAssigneeId('');
    setPriority('Medium'); setDueDate(''); setTimelineDays('3'); setScheduledDate('');
    setTaskProject(''); setSubTypeFilter(''); setNeedsBothRoles(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Design Summer Banner" required />
      </div>

      {/* Description (optional) */}
      {showDescription && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Details, references, links..." />
        </div>
      )}

      {/* Target Department */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Target Department *</label>
        <select value={targetDept} onChange={e => { setTargetDept(e.target.value); setAssigneeId(''); setSubTypeFilter(''); setNeedsBothRoles(false); setCoAssigneeId(''); }}
          className="w-full glass-input p-3 rounded-xl text-xs" required>
          <option value="">-- Select department --</option>
          {ALLOWED_TARGET_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Role Type (Videography only) */}
      {isVideographyDept && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Role Type</label>
          <select value={subTypeFilter} onChange={e => { setSubTypeFilter(e.target.value); setAssigneeId(''); setCoAssigneeId(''); setNeedsBothRoles(false); }}
            className="w-full glass-input p-3 rounded-xl text-xs">
            <option value="">All Roles</option>
            <option value="Videographer">Videographer</option>
            <option value="Content Creator">Content Creator / Influencer</option>
          </select>
        </div>
      )}

      {/* Requires both roles toggle (Videography only) */}
      {isVideographyDept && subTypeFilter && (
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

      {/* Assignee + Project row */}
      {showAssignee && (
        <div className={`grid gap-4 ${showProject ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assignee *</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs" disabled={!targetDept}>
              <option value="">Whole department (unassigned)</option>
              {deptStaff.map(emp => {
                const info = computedDueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, computedDueDate, targetDept, priority) : null;
                const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, computedDueDate) : emp.name;
                return <option key={emp.id} value={emp.id} className={
                  info?.color === 'red' ? 'text-red-400' :
                  info?.color === 'amber' ? 'text-amber-400' : ''
                }>{label}</option>;
              })}
            </select>
          </div>
          {showProject && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project</label>
              <select value={taskProject} onChange={e => setTaskProject(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-xs">
                <option value="General">General Task</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Co-Assignee (Videography, both roles required) */}
      {needsBothRoles && coDeptStaff.length > 0 && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Co-Assignee ({subTypeFilter === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
          <select value={coAssigneeId} onChange={e => setCoAssigneeId(e.target.value)}
            className="w-full glass-input p-3 rounded-xl text-xs" required>
            <option value="">-- Select co-assignee --</option>
            {coDeptStaff.map(emp => {
              const info = computedDueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, computedDueDate, targetDept, priority) : null;
              const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, computedDueDate) : emp.name;
              return <option key={emp.id} value={emp.id} className={
                info?.color === 'red' ? 'text-red-400' :
                info?.color === 'amber' ? 'text-amber-400' : ''
              }>{label}</option>;
            })}
          </select>
        </div>
      )}

      {/* Priority + Due Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Priority</label>
          <select value={priority} onChange={e => { setPriority(e.target.value); if (e.target.value === 'Emergency') setTimelineDays('0'); }}
            className="w-full glass-input p-3 rounded-xl text-xs">
            <option value="Emergency">Emergency</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
        {priority === 'Emergency' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Completion Timeline</label>
            <select value={timelineDays} onChange={e => setTimelineDays(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs">
              <option value="0">Today (ASAP)</option>
              <option value="1">Tomorrow (End of day)</option>
              <option value="2">Day After Tomorrow</option>
            </select>
            <p className="text-3xs text-rose-400 mt-1 font-semibold">Due: {computedDueDate}</p>
          </div>
        ) : rule.mode === 'manual' ? (
          <div>
            <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
        ) : rule.mode === 'select' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Timeline</label>
            <select value={timelineDays} onChange={e => setTimelineDays(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs">
              {(rule.options || [3, 5]).map(d => (
                <option key={d} value={d}>{d} Days from today</option>
              ))}
            </select>
            <p className="text-3xs text-slate-500 mt-1">Due: {addDays(todayStr(), parseInt(timelineDays))}</p>
          </div>
        ) : rule.mode === 'fixed' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Due Date</label>
            <p className="text-xs text-slate-300 mt-2">Auto: {addDays(todayStr(), rule.days)} (fixed {rule.days} days)</p>
          </div>
        ) : (
          <div>
            <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
        )}
      </div>

      {/* Prior Date (creative depts only) */}
      {isCreativeDept && (
        <div>
          <DatePicker label="Prior Date" value={scheduledDate} onChange={setScheduledDate} />
        </div>
      )}

      {/* Submit + Cancel */}
      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="flex-1 bg-[var(--accent-strong)] hover:bg-[var(--accent)] py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Assign Work Entry
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
}

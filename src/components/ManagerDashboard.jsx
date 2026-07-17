import { useState, useMemo } from 'react';
import { Plus, Bell, BellOff, RefreshCw, Clock, AlertCircle, CheckCircle, Edit2, Trash2, Save, X, Search, Filter, ChevronDown } from 'lucide-react';
import { useToast } from './shared/Toast';
import { checkPingCooldown, formatCooldown } from '../lib/deadlineEngine';
import { genId, today as todayStr, addDays, computeDueDate } from '../lib/format';
import { db } from '../data/db';
import TaskCard from './shared/TaskCard';
import TaskDetailPanel from './shared/TaskDetailPanel';
import DepartmentKpiStrip from './shared/DepartmentKpiStrip';
import { DatePicker, ConfirmDialog } from './ui';
import { getWorkloadInfo, formatWorkloadLabel } from '../lib/workloadCaps';

const ALLOWED_TARGET_DEPTS = ['Developers', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Paid Ads', 'Social Media'];
export const CREATIVE_DEPTS = ['Video Editors', 'Graphic Designers', 'Videography/Photography'];

export const DEPT_TIMELINE_RULES = {
  'Developers':              { mode: 'manual', label: 'Manual' },
  'Paid Ads':                { mode: 'manual', label: 'Manual' },
  'Video Editors':           { mode: 'select', options: [3, 5], label: 'Editors timeline' },
  'Graphic Designers':       { mode: 'select', options: [3, 5], label: 'Designers timeline' },
  'Videography/Photography': { mode: 'select', options: [3, 4, 5], label: 'Videography timeline' },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerDashboard({ user, state, updateState, setActiveTab }) {
  const toast = useToast();
  const { employees, tasks, timelogs, projects, notifications } = state;

  const isSuperAdmin = user.role === 'Super Admin';
  const managerDept  = user.department;

  const canAssignTasks = user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin' || user.department?.includes('Social Media');
  const isManager = user.role === 'Super Admin' || user.role === 'Manager';

  // ── Task creation form ────────────────────────────────────────────────────
  const [targetDept,   setTargetDept]   = useState('');
  const [taskTitle,    setTaskTitle]    = useState('');
  const [assigneeId,   setAssigneeId]   = useState('');
  const [taskProject,  setTaskProject]  = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDue,      setTaskDue]      = useState('');
  const [timelineDays, setTimelineDays] = useState('3');
  const [taskScheduledDate, setTaskScheduledDate] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [needsBothRoles, setNeedsBothRoles] = useState(false);
  const [coAssigneeId, setCoAssigneeId] = useState('');

  const rule = DEPT_TIMELINE_RULES[targetDept] || {};
  const isVideographyDept = targetDept === 'Videography/Photography';
  const deptStaff = targetDept
    ? employees.filter(emp =>
        emp.department?.includes(targetDept) &&
        (!isVideographyDept || !subTypeFilter || emp.subType === subTypeFilter)
      )
    : [];
  const coDeptStaff = (needsBothRoles && isVideographyDept && subTypeFilter)
    ? employees.filter(emp =>
        emp.department?.includes(targetDept) &&
        emp.subType !== subTypeFilter &&
        emp.id !== assigneeId
      )
    : [];
  const deptTasks = tasks.filter(task => {
    if (isSuperAdmin) return true;
    if (ALLOWED_TARGET_DEPTS.includes(task.department)) return true;
    if (task.assignedBy === user.id || task.assignedTo === user.id || task.assignedTo2 === user.id) return true;
    return false;
  });
  const isCreativeDept = CREATIVE_DEPTS.includes(targetDept);

  // ── Reassignment ──────────────────────────────────────────────────────────
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignEmpId,  setReassignEmpId]  = useState('');

  // ── Ping state ────────────────────────────────────────────────────────────
  const [activePingTaskId, setActivePingTaskId] = useState('');
  const [pingMessages,     setPingMessages]     = useState({});

  // ── TaskDetailPanel state ─────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // ── Task filters ─────────────────────────────────────────────────────────
  const [taskFilterStatus, setTaskFilterStatus] = useState('');
  const [taskFilterPriority, setTaskFilterPriority] = useState('');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState('');
  const [taskFilterDept, setTaskFilterDept] = useState('');
  const [taskFilterSearch, setTaskFilterSearch] = useState('');
  const [taskFilterOwner, setTaskFilterOwner] = useState('mine');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTasks = useMemo(() => {
    let result = deptTasks;
    if (taskFilterOwner === 'mine') result = result.filter(t => t.assignedBy === user.id);
    if (taskFilterStatus)   result = result.filter(t => t.status === taskFilterStatus);
    if (taskFilterPriority) result = result.filter(t => t.priority === taskFilterPriority);
    if (taskFilterAssignee) result = result.filter(t => t.assignedTo === taskFilterAssignee || t.assignedTo2 === taskFilterAssignee);
    if (taskFilterDept)     result = result.filter(t => t.department === taskFilterDept);
    if (taskFilterSearch) {
      const q = taskFilterSearch.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [deptTasks, taskFilterOwner, taskFilterStatus, taskFilterPriority, taskFilterAssignee, taskFilterDept, taskFilterSearch, user.id]);

  const activeFilterCount = [taskFilterOwner !== 'mine' ? taskFilterOwner : '', taskFilterStatus, taskFilterPriority, taskFilterAssignee, taskFilterDept, taskFilterSearch].filter(Boolean).length;
  const clearFilters = () => { setTaskFilterOwner('mine'); setTaskFilterStatus(''); setTaskFilterPriority(''); setTaskFilterAssignee(''); setTaskFilterDept(''); setTaskFilterSearch(''); };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle || !assigneeId || !targetDept) return;

    const dueDate = computeDueDate({ priority: taskPriority, timelineDays, dueDate: taskDue, rule });

    // ── Workload cap check ──
    if (assigneeId && dueDate && CREATIVE_DEPTS.includes(targetDept)) {
      const info = getWorkloadInfo(tasks, assigneeId, dueDate, targetDept, taskPriority);
      if (!info.canAssign) {
        toast.error(info.reason);
        return;
      }
      if (info.reason && !info.reason.startsWith('⚠️')) {
        toast.warning(info.reason);
      }
    }

    if (needsBothRoles && coAssigneeId && dueDate && CREATIVE_DEPTS.includes(targetDept)) {
      const coInfo = getWorkloadInfo(tasks, coAssigneeId, dueDate, targetDept, taskPriority);
      if (!coInfo.canAssign) {
        toast.error(`Co-assignee: ${coInfo.reason}`);
        return;
      }
    }

    const staffMember = employees.find(emp => emp.id === assigneeId);
    const coMember = needsBothRoles && coAssigneeId ? employees.find(emp => emp.id === coAssigneeId) : null;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newTask = {
      id:            genId('T'),
      title:         taskTitle,
      assignedTo:    assigneeId,
      assigneeName:  staffMember?.name || '',
      assignedTo2:   coMember?.id || null,
      assigneeName2: coMember?.name || '',
      assignedBy:    user.id,
      department:    targetDept,
      sourceDept:    'Work Assignment',
      projectId:     taskProject || 'General',
      priority:      taskPriority,
      status:        'New',
      dueDate,
      createdAt:     new Date().toISOString().split('T')[0],
      pinged:        0,
      lastPingedAt:  null,
      scheduledDate: isCreativeDept ? taskScheduledDate || null : null,
    };

    const newNotifs = [{
      id:        genId('NTF'),
      userId:    assigneeId,
      message:   `${user.name} assigned task "${taskTitle}" to you.`,
      type:      'assignment',
      timestamp: now,
      read:      false,
    }];
    if (coMember) {
      newNotifs.push({
        id:        `NTF${Date.now()}_co`,
        userId:    coAssigneeId,
        message:   `${user.name} assigned you as co-assignee on "${taskTitle}".`,
        type:      'assignment',
        timestamp: now,
        read:      false,
      });
    }

    updateState({ tasks: [...tasks, newTask] });
    updateState({ notifications: [...newNotifs, ...notifications] });
    updateState({ auditLogs: [{
      id:        genId('AUD'),
      userId:    user.id,
      action:    'Task Created',
      details:   `${user.name} assigned task "${taskTitle}" to ${staffMember?.name}${coMember ? ` + ${coMember?.name}` : ''} (${targetDept}).`,
      timestamp: now,
    }, ...state.auditLogs] });

    toast.success(`Task assigned to ${staffMember?.name}${coMember ? ` + ${coMember.name}` : ''}.`, `"${taskTitle}"`);
    setTaskTitle(''); setAssigneeId(''); setTaskDue(''); setTaskScheduledDate(''); setTargetDept(''); setTimelineDays('3');
    setNeedsBothRoles(false); setCoAssigneeId('');
  };

  const handleReassignSubmit = (e, taskId) => {
    e.preventDefault();
    if (!reassignEmpId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!canManageTask(task)) {
      toast.error('You do not have permission to reassign this task.');
      return;
    }
    const staffMember = employees.find(emp => emp.id === reassignEmpId);
    const origTitle = task?.title;
    const now       = new Date().toISOString().replace('T', ' ').substring(0, 16);

    updateState({ tasks: tasks.map(t =>
      t.id === taskId ? { ...t, assignedTo: reassignEmpId, assigneeName: staffMember?.name || '' } : t
    )});

    const reassignNotifs = [{
      id:        `NTF${Date.now()}_a`,
      userId:    reassignEmpId,
      message:   `${user.name} reassigned task "${origTitle}" to you.`,
      type:      'assignment',
      timestamp: now,
      read:      false,
    }];
    if (task?.assignedTo && task.assignedTo !== reassignEmpId) {
      reassignNotifs.push({
        id:        `NTF${Date.now()}_b`,
        userId:    task.assignedTo,
        message:   `Task "${origTitle}" was reassigned from you to ${staffMember?.name}.`,
        type:      'info',
        timestamp: now,
        read:      false,
      });
    }
    updateState({ notifications: [...reassignNotifs, ...notifications] });

    toast.info(`Task reassigned to ${staffMember?.name}.`, `"${origTitle}"`);
    setReassignTaskId(''); setReassignEmpId('');
  };

  /**
   * Enhanced ping: custom message + 4-hour cooldown enforced per task.
   */
  const handlePingAssignee = (task) => {
    const { canPing, hoursLeft, minutesLeft } = checkPingCooldown(task);
    if (!canPing) {
      toast.warning(
        `Wait ${hoursLeft > 0 ? `${hoursLeft}h ` : ''}${minutesLeft}m before pinging again.`,
        'Ping cooldown active'
      );
      return;
    }

    const customMsg  = pingMessages[task.id]?.trim();
    const now        = new Date().toISOString();
    const nowDisplay = now.replace('T', ' ').substring(0, 16);
    const message    = customMsg
      ? `📌 ${user.name} pinged you on "${task.title}": ${customMsg}`
      : `🔔 ${user.name} pinged you on "${task.title}" — please update your status!`;

    updateState({ tasks: tasks.map(t =>
      t.id === task.id
        ? { ...t, pinged: (t.pinged || 0) + 1, lastPingedAt: now }
        : t
    )});
    updateState({ notifications: [{
      id:        genId('NTF'),
      userId:    task.assignedTo,
      message,
      type:      'ping',
      timestamp: nowDisplay,
      read:      false,
    }, ...notifications] });
    updateState({ auditLogs: [{
      id:        genId('AUD'),
      userId:    user.id,
      action:    'Task Ping Sent',
      details:   `${user.name} pinged "${task.title}"${customMsg ? ` with message: "${customMsg}"` : ''}.`,
      timestamp: nowDisplay,
    }, ...state.auditLogs] });

    toast.success('Ping dispatched to assignee.', `"${task.title}"`);

    setActivePingTaskId('');
    setPingMessages(prev => { const n = { ...prev }; delete n[task.id]; return n; });
  };

  // ── Review/Approval state ─────────────────────────────────────────────
  const [changeRequestTaskId, setChangeRequestTaskId] = useState('');
  const [changeRequestText, setChangeRequestText] = useState('');

  const handleApproveTask = (task) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const assignee = employees.find(e => e.id === task.assignedTo);

    updateState({
      tasks: (state.tasks || []).map(t =>
        t.id === task.id ? { ...t, status: 'Completed', approvedAt: now } : t
      ),
      notifications: [{
        id: genId('NTF'),
        userId: task.assignedTo,
        message: `✅ ${user.name} approved your task "${task.title}". Great work!`,
        type: 'info',
        timestamp: now,
        read: false,
      }, ...(state.notifications || [])],
      auditLogs: [{
        id: genId('AUD'),
        userId: user.id,
        action: 'Task Approved',
        details: `${user.name} approved task "${task.title}" assigned to ${assignee?.name || task.assignedTo}.`,
        timestamp: now,
      }, ...(state.auditLogs || [])],
    });
    toast.success('Task approved and marked as completed.', `"${task.title}"`);
  };

  const handleRequestChanges = (task) => {
    const notes = changeRequestText.trim();
    if (!notes) {
      toast.warning('Please describe the changes needed before requesting changes.');
      return;
    }
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const assignee = employees.find(e => e.id === task.assignedTo);
    const revisionCount = (task.revisionCount || 0) + 1;

    updateState({
      tasks: (state.tasks || []).map(t =>
        t.id === task.id ? {
          ...t,
          status: 'In Progress',
          revisionCount,
          changeRequest: notes,
          changeRequestedAt: now,
        } : t
      ),
      notifications: [{
        id: genId('NTF'),
        userId: task.assignedTo,
        message: `🔄 ${user.name} requested changes on "${task.title}" (revision ${revisionCount}): "${notes.substring(0, 100)}${notes.length > 100 ? '…' : ''}"`,
        type: 'info',
        timestamp: now,
        read: false,
      }, ...(state.notifications || [])],
      auditLogs: [{
        id: genId('AUD'),
        userId: user.id,
        action: 'Changes Requested',
        details: `${user.name} requested changes on "${task.title}" (v${revisionCount}): ${notes}`,
        timestamp: now,
      }, ...(state.auditLogs || [])],
    });

    setChangeRequestTaskId('');
    setChangeRequestText('');
    toast.success('Change request sent to assignee.', `"${task.title}"`);
  };

  // ── Task Edit state ────────────────────────────────────────────────────
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editAssignee2, setEditAssignee2] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editDue, setEditDue] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });

  const handleDeleteTask = async (taskId) => {
    setConfirmState({
      open: true,
      message: 'Delete this task permanently?',
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        const task = tasks.find(t => t.id === taskId);
        if (!canManageTask(task)) {
          toast.error('You do not have permission to delete this task.');
          return;
        }
        const taskTitle = task?.title;
        updateState({ tasks: tasks.filter(t => t.id !== taskId) });
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
        updateState({ auditLogs: [{
          id: genId('AUD'),
          userId: user.id,
          action: 'Task Deleted',
          details: `${user.name} deleted task "${taskTitle}".`,
          timestamp: now,
        }, ...state.auditLogs] });
        try {
          await db.deleteTask(taskId);
        } catch (err) {
          console.error('Failed to delete task from database:', err);
        }
        toast.success('Task deleted.');
      }
    });
  };

  const handleEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditDept(task.department);
    setEditAssignee(task.assignedTo);
    setEditAssignee2(task.assignedTo2 || '');
    setEditPriority(task.priority);
    setEditDue(task.dueDate || '');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editAssignee) return;
    const task = tasks.find(t => t.id === editTaskId);
    if (!canManageTask(task)) {
      toast.error('You do not have permission to edit this task.');
      return;
    }
    updateState({
      tasks: tasks.map(t =>
        t.id === editTaskId ? {
          ...t,
          title: editTitle,
          department: editDept,
          assignedTo: editAssignee,
          assigneeName: employees.find(e => e.id === editAssignee)?.name || '',
          assignedTo2: editAssignee2 || null,
          assigneeName2: editAssignee2 ? employees.find(e => e.id === editAssignee2)?.name || '' : '',
          priority: editPriority,
          dueDate: editDue,
        } : t
      ),
    });
    toast.success('Task updated.');
    setEditTaskId(null);
  };

  // ── renderActions: ping + reassign + edit/delete, passed to TaskCard ───
  const canManageTask = (task) =>
    isSuperAdmin || (isManager && Array.isArray(managerDept) && managerDept.includes(task.department)) || task.assignedBy === user.id;

  const renderPingReassign = (task) => {
    const assignee       = employees.find(e => e.id === task.assignedTo);
    const isReassigning  = reassignTaskId === task.id;
    const isPingOpen     = activePingTaskId === task.id;
    const cooldown       = formatCooldown(task);
    const isCompleted    = task.status === 'Completed';
    const canManage      = canManageTask(task);
    const taskDeptStaff  = employees.filter(e => e.department?.includes(task.department));

    // Top row: action buttons (rendered above the compose boxes)
    if (!isReassigning && !isPingOpen && changeRequestTaskId !== task.id) {
      // Task is in Review — show Approve / Request Changes
      if (task.status === 'Review') {
        return (
          <div className="flex flex-wrap gap-2 justify-end border-t border-slate-800/40 pt-2.5">
            {canManage && (
              <>
                <button
                  onClick={() => handleEditTask(task)}
                  className="bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-2xs text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-blue-400" /> Edit
                </button>
                <button
                  onClick={() => { setReassignTaskId(task.id); setActivePingTaskId(''); setChangeRequestTaskId(''); }}
                  className="bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-2xs text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-fuchsia-400" /> Reassign
                </button>
              </>
            )}
            {canManage && (
              <button
                onClick={() => handleApproveTask(task)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
            )}
            {canManage && (
              <button
                onClick={() => { setChangeRequestTaskId(task.id); setChangeRequestText(''); setActivePingTaskId(''); setReassignTaskId(''); }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Request Changes
              </button>
            )}
            {canManage && (
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/20 text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2 justify-end border-t border-slate-800/40 pt-2.5">
          {canManage && (
            <>
              <button
                onClick={() => handleEditTask(task)}
                className="bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-2xs text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-blue-400" /> Edit
              </button>
              <button
                onClick={() => { setReassignTaskId(task.id); setActivePingTaskId(''); }}
                className="bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-2xs text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-fuchsia-400" /> Reassign
              </button>
            </>
          )}
          {isCompleted ? (
            <span className="px-3 py-1.5 rounded-xl text-2xs font-bold text-slate-600 border border-slate-800">
              Done
            </span>
          ) : cooldown ? (
            <button disabled
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-2xs font-bold text-slate-600 border border-slate-800 cursor-not-allowed">
              <BellOff className="w-3 h-3" /> {cooldown}
            </button>
          ) : (
            <button
              onClick={() => { setActivePingTaskId(task.id); setReassignTaskId(''); }}
              className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-xl text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Bell className="w-3 h-3" /> Ping
            </button>
          )}
          {canManage && (
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-3 py-1.5 rounded-xl border border-rose-500/20 text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        {isPingOpen && (
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2.5">
            <p className="text-2xs font-semibold text-violet-300">
              Send ping to {assignee?.name || 'assignee'}
            </p>
            <textarea
              value={pingMessages[task.id] || ''}
              onChange={e => setPingMessages(prev => ({ ...prev, [task.id]: e.target.value }))}
              className="w-full glass-input p-2.5 rounded-lg text-xs h-14 resize-none"
              placeholder="Optional message — leave blank for a generic status-check ping…"
              maxLength={200}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setActivePingTaskId(''); setPingMessages(p => { const n={...p}; delete n[task.id]; return n; }); }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePingAssignee(task)}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-2xs font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <Bell className="w-3 h-3" /> Send Ping
              </button>
            </div>
          </div>
        )}

        {isReassigning && (
          <form onSubmit={e => handleReassignSubmit(e, task.id)}
            className="flex gap-2 flex-wrap">
            <select value={reassignEmpId} onChange={e => setReassignEmpId(e.target.value)}
              className="glass-input p-2 rounded text-2xs cursor-pointer flex-1" required>
              <option value="">-- Select new assignee --</option>
              {taskDeptStaff.filter(e => e.id !== task.assignedTo).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-2xs font-bold cursor-pointer">
              Confirm
            </button>
            <button type="button" onClick={() => setReassignTaskId('')}
              className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded text-2xs cursor-pointer">
              Cancel
            </button>
          </form>
        )}

        {changeRequestTaskId === task.id && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2.5">
            <p className="text-2xs font-semibold text-amber-300">
              Request changes from {assignee?.name || 'assignee'}
            </p>
            <textarea
              value={changeRequestText}
              onChange={e => setChangeRequestText(e.target.value)}
              className="w-full glass-input p-2.5 rounded-lg text-xs h-20 resize-none"
              placeholder="Describe what changes are needed — be specific about deliverables, formatting, revisions..."
              maxLength={500}
            />
            <p className="text-3xs text-slate-500 text-right">{changeRequestText.length}/500</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setChangeRequestTaskId(''); setChangeRequestText(''); }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-semibold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestChanges(task)}
                disabled={!changeRequestText.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-2xs font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit2 className="w-3 h-3" /> Send Change Request
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── KPI strip (pending HR / ad-stats actions) ── */}
      <DepartmentKpiStrip state={state} setActiveTab={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Task Creator ── */}
        {canAssignTasks && (
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-5">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-400" /> Assign Team Task
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Design Summer Banner" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Department</label>
                <select value={targetDept} onChange={e => { setTargetDept(e.target.value); setAssigneeId(''); setSubTypeFilter(''); }}
                  className="w-full glass-input p-3 rounded-xl text-xs" required>
                  <option value="">-- Select department --</option>
                  {ALLOWED_TARGET_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assignee</label>
                  <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" required disabled={!targetDept}>
                    <option value="">-- Select --</option>
                    {deptStaff.map(emp => {
                      const dueDate = computeDueDate({ priority: taskPriority, timelineDays, dueDate: taskDue, rule });
                      const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, dueDate, targetDept, taskPriority) : null;
                      const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, dueDate) : emp.name;
                      return <option key={emp.id} value={emp.id} className={
                        info?.color === 'red' ? 'text-red-400' :
                        info?.color === 'amber' ? 'text-amber-400' :
                        ''
                      }>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Project</label>
                  <select value={taskProject} onChange={e => setTaskProject(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs">
                    <option value="General">General Task</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              {needsBothRoles && coDeptStaff.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Co-Assignee ({subTypeFilter === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
                  <select value={coAssigneeId} onChange={e => setCoAssigneeId(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" required>
                    <option value="">-- Select co-assignee --</option>
                    {coDeptStaff.map(emp => {
                      const dueDate = computeDueDate({ priority: taskPriority, timelineDays, dueDate: taskDue, rule });
                      const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, dueDate, targetDept, taskPriority) : null;
                      const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, dueDate) : emp.name;
                      return <option key={emp.id} value={emp.id} className={
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
                   <select value={taskPriority} onChange={e => { setTaskPriority(e.target.value); if (e.target.value === 'Emergency') setTimelineDays('0'); }}
                    className="w-full glass-input p-3 rounded-xl text-xs">
                    <option value="Emergency">Emergency</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
                {taskPriority === 'Emergency' ? (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Completion Timeline</label>
                    <select value={timelineDays} onChange={e => setTimelineDays(e.target.value)}
                      className="w-full glass-input p-3 rounded-xl text-xs">
                      <option value="0">Today (ASAP)</option>
                      <option value="1">Tomorrow (End of day)</option>
                      <option value="2">Day After Tomorrow</option>
                    </select>
                    <p className="text-3xs text-rose-400 mt-1 font-semibold">Due: {computeDueDate({ priority: taskPriority, timelineDays, dueDate: taskDue, rule })}</p>
                  </div>
                ) : rule.mode === 'manual' ? (
                  <div>
                    <DatePicker label="Due Date" value={taskDue} onChange={setTaskDue} required />
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
                ) : null}
              </div>
              {isCreativeDept && (
                <div>
                  <DatePicker label="Prior Date" value={taskScheduledDate} onChange={setTaskScheduledDate} />
                </div>
              )}
              <button type="submit"
                className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer">
                Assign Work Entry
              </button>
            </form>
          </div>
        )}

        {/* ── Task List with enhanced Ping ── */}
        <div className={`glass-panel p-6 rounded-2xl ${canAssignTasks ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100">
              Team Tasks {!isSuperAdmin && `— ${managerDept}`}
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                showFilters ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500 text-white text-3xs font-bold">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={taskFilterSearch}
                  onChange={e => setTaskFilterSearch(e.target.value)}
                  className="w-full glass-input pl-8 pr-3 py-1.5 rounded-lg text-xs"
                  placeholder="Search by title, ID, or description..."
                />
              </div>

              {/* Filter dropdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* Owner */}
                <div className="relative">
                  <select
                    value={taskFilterOwner}
                    onChange={e => setTaskFilterOwner(e.target.value)}
                    className="w-full glass-input appearance-none pr-7 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="mine">My Assignments</option>
                    <option value="">All Tasks</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={taskFilterStatus}
                    onChange={e => setTaskFilterStatus(e.target.value)}
                    className="w-full glass-input appearance-none pr-7 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="">All Status</option>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                {/* Priority */}
                <div className="relative">
                  <select
                    value={taskFilterPriority}
                    onChange={e => setTaskFilterPriority(e.target.value)}
                    className="w-full glass-input appearance-none pr-7 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="">All Priority</option>
                    <option value="Emergency">Emergency</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                {/* Assignee */}
                <div className="relative">
                  <select
                    value={taskFilterAssignee}
                    onChange={e => setTaskFilterAssignee(e.target.value)}
                    className="w-full glass-input appearance-none pr-7 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="">All Members</option>
                    {deptStaff.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                {/* Department */}
                <div className="relative">
                  <select
                    value={taskFilterDept}
                    onChange={e => setTaskFilterDept(e.target.value)}
                    className="w-full glass-input appearance-none pr-7 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    <option value="">All Depts</option>
                    {ALLOWED_TARGET_DEPTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-3xs text-violet-400 hover:text-violet-300 font-medium transition cursor-pointer">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {filteredTasks.length === 0 ? (
              <p className="text-slate-400 text-center py-12 text-sm">
                {activeFilterCount > 0 ? 'No tasks match your filters.' : 'No tasks in queue.'}
              </p>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={employees.find(e => e.id === task.assignedTo)}
                  assignee2={task.assignedTo2 ? employees.find(e => e.id === task.assignedTo2) : null}
                  viewMode="manager"
                  onOpenDetail={(t) => setSelectedTaskId(t.id)}
                  renderActions={renderPingReassign}
                  currentUser={user}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: metrics + timelog review ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider">Team Task Metrics</h3>
          <div className="space-y-3">
            {deptStaff.map(emp => {
              const empTasks  = tasks.filter(t => t.assignedTo === emp.id || t.assignedTo2 === emp.id);
              const completed = empTasks.filter(t => t.status === 'Completed').length;
              const overdue   = empTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr()).length;
              const pending   = empTasks.filter(t => t.status !== 'Completed').length;
              return (
                <div key={emp.id} className="p-3 bg-slate-950/45 border border-slate-900 rounded-xl text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200">{emp.name}</h4>
                      <p className="text-3xs text-slate-500">{emp.designation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-mono font-semibold">{completed} done</span>
                      <span className="text-slate-600"> / </span>
                      <span className="text-slate-400 font-mono">{pending} pending</span>
                    </div>
                  </div>
                  {overdue > 0 && (
                    <div className="mt-1.5 text-3xs text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {overdue} overdue task{overdue > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" /> Recent Department Log Review
          </h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {timelogs.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">No time reported in this segment.</p>
            ) : (
              timelogs
                .filter(log => isSuperAdmin ? true : employees.find(e => e.id === log.employeeId)?.department === managerDept)
                .map(log => {
                  const emp  = employees.find(e => e.id === log.employeeId);
                  const task = tasks.find(t => t.id === log.taskId);
                  return (
                    <div key={log.id} className="p-3 bg-slate-950/45 border border-slate-900 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">
                          {emp ? emp.name : 'Unknown'} —{' '}
                          <span className="font-normal text-slate-400">{task ? task.title : 'General'}</span>
                        </div>
                        <p className="text-3xs text-slate-500 mt-0.5">"{log.description}" · {log.date}</p>
                      </div>
                      <span className="bg-violet-500/10 text-violet-400 px-3 py-1 rounded-xl font-bold font-mono text-xs">
                        {log.hours} Hrs
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Task Modal ── */}
      {editTaskId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditTaskId(null)}>
          <div className="glass-panel border border-violet-500/20 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-violet-400" /> Edit Task
              </h3>
              <button onClick={() => setEditTaskId(null)} className="text-slate-500 hover:text-slate-200 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task ID</label>
                <p className="text-xs font-mono text-violet-400 font-semibold">{editTaskId}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Department</label>
                <select value={editDept} onChange={e => setEditDept(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-xs">
                  {ALLOWED_TARGET_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assignee</label>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-xs" required>
                  <option value="">-- Select --</option>
                  {employees.filter(emp => emp.department?.includes(editDept)).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs">
                    <option value="Emergency">Emergency</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditTaskId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Task detail slide-in ── */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          state={state}
          updateState={updateState}
          currentUser={user}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, message: '', onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        message={confirmState.message}
      />
    </div>
  );
}
import { useState, useMemo, useRef } from 'react';
import {
  Film, Image, Camera, Plus, AlertCircle, User, Link as LinkIcon,
  Filter, UserPlus, Edit3, GripVertical, RefreshCw, Trash2,
  CalendarCheck, CalendarClock, ClockAlert, CheckCircle,
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { genId, today as todayStr, addDays } from '../../lib/format';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { db } from '../../data/db';
import TaskFormModal from './Creative/TaskFormModal';
import RevisionModal from './Creative/RevisionModal';
import DelegationModal from './Creative/DelegationModal';
import RescheduleModal from './Creative/RescheduleModal';
import DelayReportModal from './Creative/DelayReportModal';
import ReassignModal from './Creative/ReassignModal';
import EditTaskModal from './Creative/EditTaskModal';
import DeleteConfirmModal from './Creative/DeleteConfirmModal';

const COLUMNS = ['New', 'In Progress', 'Review', 'Completed'];

const COLUMN_STYLES = {
  'New':         { header: 'text-fuchsia-300',     panelBg: 'bg-fuchsia-950/20',    borderCol: 'border-fuchsia-500/20',     glow: 'shadow-fuchsia-500/5' },
  'In Progress': { header: 'text-blue-300',       panelBg: 'bg-blue-950/20',       borderCol: 'border-blue-500/20',        glow: 'shadow-blue-500/5' },
  'Review':      { header: 'text-amber-300',      panelBg: 'bg-amber-950/20',      borderCol: 'border-amber-500/20',       glow: 'shadow-amber-500/5' },
  'Completed':   { header: 'text-emerald-300',    panelBg: 'bg-emerald-950/20',    borderCol: 'border-emerald-500/20',     glow: 'shadow-emerald-500/5' },
};

const DEPT_DOT = {
  'Paid Ads':               'bg-orange-500',
  'Social Media':           'bg-fuchsia-500',
  'Video Editors':          'bg-red-500',
  'Graphic Designers':      'bg-pink-500',
  'Videography/Photography':'bg-teal-500',
  'Developers':             'bg-blue-500',
  'HR':                     'bg-emerald-500',
};

export default function Creative({ user, state, updateState, activeDepartment }) {
  const { tasks, employees } = state;
  const toast = useToast();

  const canAssignTasks = user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin' || user.department?.includes('Social Media');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const creativeStaff = employees.filter(emp =>
    emp.department?.includes(activeDepartment) &&
    (!subTypeFilter || emp.subType === subTypeFilter)
  );

  // ── Form state ──────────────────────────────────────────────────────────
  const [taskTitle, setTaskTitle] = useState('');
  const [daysPrior, setDaysPrior] = useState('3');
  const [assigneeId, setAssigneeId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [needsBothRoles, setNeedsBothRoles] = useState(false);
  const [coAssigneeId, setCoAssigneeId] = useState('');

  const coAssigneeStaff = (needsBothRoles && subTypeFilter)
    ? employees.filter(emp =>
        emp.department?.includes(activeDepartment) &&
        emp.subType !== subTypeFilter &&
        emp.id !== assigneeId
      )
    : [];

  // ── Quick filters, modals ──────────────────────────────────────────────
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // ── Revision ────────────────────────────────────────────────────────────
  const [revisionTaskId, setRevisionTaskId] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');

  // ── Delegation (Social Media → Manager → Staff) ────────────────────────
  const [delegateTaskId, setDelegateTaskId] = useState(null);
  const [delegateEmpId, setDelegateEmpId] = useState('');

  // ── Shoot approval / reschedule (Videography only) ────────────────────
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // ── Delay reporting ───────────────────────────────────────────────────
  const [delayTaskId, setDelayTaskId] = useState(null);
  const [delayReason, setDelayReason] = useState('');
  const [delayNewDueDate, setDelayNewDueDate] = useState('');

  // ── Reassign ────────────────────────────────────────────────────────────
  const [reassignTaskId, setReassignTaskId] = useState(null);
  const [reassignEmpId, setReassignEmpId] = useState('');

  // ── Edit ────────────────────────────────────────────────────────────────
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editDue, setEditDue] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editAssignee2, setEditAssignee2] = useState('');

  // ── Delete confirmation ─────────────────────────────────────────────────
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const canManageTask = (task) =>
    user.role === 'Super Admin' ||
    (user.role === 'Manager' && user.department?.includes(task.department)) ||
    task.assignedBy === user.id;

  // ── Drag ────────────────────────────────────────────────────────────────
  const [dragOverCol, setDragOverCol] = useState(null);

  // ── Keyboard navigation ────────────────────────────────────────────────
  const [focusedCol, setFocusedCol] = useState(null);
  const [focusedTaskIdx, setFocusedTaskIdx] = useState(null);
  const kanbanRef = useRef(null);

  const handleKanbanKeyDown = (e) => {
    const colKeys = Object.keys(columns);
    const colIdx = focusedCol !== null ? colKeys.indexOf(focusedCol) : -1;
    const tasksInCol = focusedCol ? (columns[focusedCol] || []) : [];

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (colIdx < colKeys.length - 1) {
          const nextCol = colKeys[colIdx + 1];
          setFocusedCol(nextCol);
          setFocusedTaskIdx(null);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIdx > 0) {
          const prevCol = colKeys[colIdx - 1];
          setFocusedCol(prevCol);
          setFocusedTaskIdx(null);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (focusedCol && tasksInCol.length > 0) {
          setFocusedTaskIdx(prev =>
            prev === null ? 0 : Math.min(prev + 1, tasksInCol.length - 1)
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusedCol && tasksInCol.length > 0) {
          setFocusedTaskIdx(prev =>
            prev === null ? tasksInCol.length - 1 : Math.max(prev - 1, 0)
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedCol && focusedTaskIdx !== null && tasksInCol[focusedTaskIdx]) {
          handleOpenDetail(tasksInCol[focusedTaskIdx]);
        }
        break;
      case 'Escape':
        setFocusedCol(null);
        setFocusedTaskIdx(null);
        break;
    }
  };

  // ── Filter tasks ────────────────────────────────────────────────────────
  const deptTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      const matchesDept = task.department === activeDepartment;
      const matchesStatus = showCompleted || task.status !== 'Completed';
      if (!matchesDept || !matchesStatus) return false;
      if (quickFilter === 'mine') return task.assignedTo === user.id || task.assignedTo2 === user.id;
      if (quickFilter === 'overdue') return task.dueDate && task.dueDate < todayStr() && task.status !== 'Completed';
      if (quickFilter === 'today') return task.dueDate === todayStr() && task.status !== 'Completed';
      return true;
    });
  }, [tasks, activeDepartment, quickFilter, showCompleted, user.id]);

  const columns = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(c => { grouped[c] = []; });
    deptTasks.forEach(t => {
      const col = COLUMNS.includes(t.status) ? t.status : 'New';
      grouped[col].push(t);
    });
    return grouped;
  }, [deptTasks]);

  const overdueCount = (colTasks) =>
    colTasks.filter(t => t.dueDate && t.dueDate < todayStr() && t.status !== 'Completed').length;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !assigneeId) return;

    const effectiveDueDate = scheduledDate
      ? addDays(scheduledDate, -parseInt(daysPrior))
      : addDays(todayStr(), parseInt(daysPrior));

    if (assigneeId && effectiveDueDate) {
      const info = getWorkloadInfo(tasks, assigneeId, effectiveDueDate, activeDepartment, priority);
      if (!info.canAssign) { toast.error(info.reason); return; }
    }

    if (needsBothRoles && coAssigneeId && effectiveDueDate) {
      const coInfo = getWorkloadInfo(tasks, coAssigneeId, effectiveDueDate, activeDepartment, priority);
      if (!coInfo.canAssign) { toast.error(`Co-assignee: ${coInfo.reason}`); return; }
    }

    const assignee = employees.find(e => e.id === assigneeId);
    const coAssignee = needsBothRoles && coAssigneeId ? employees.find(e => e.id === coAssigneeId) : null;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTask = {
      id:                genId('T'),
      title:             taskTitle.trim(),
      department:        activeDepartment,
      deadlineDaysPrior: parseInt(daysPrior),
      assignedTo:        assigneeId,
      assigneeName:      assignee?.name || '',
      assignedTo2:       coAssignee?.id || null,
      assigneeName2:     coAssignee?.name || '',
      assignedBy:        user.id,
      priority:          priority,
      status:            'New',
      dueDate:           effectiveDueDate,
      scheduledDate:     scheduledDate || null,
      attachmentUrl:     attachmentUrl.trim() || null,
      revisionCount:     0,
      createdAt:         now,
    };

    const newNotifs = [];
    if (assignee) {
      newNotifs.push({
        id:        genId('NTF'),
        userId:    assigneeId,
        message:   `${user.name} assigned you a task: "${taskTitle.trim()}"`,
        type:      'assignment',
        timestamp: now,
        read:      false,
      });
    }
    if (coAssignee) {
      newNotifs.push({
        id:        `NTF${Date.now()}_co`,
        userId:    coAssigneeId,
        message:   `${user.name} assigned you as co-assignee on: "${taskTitle.trim()}"`,
        type:      'assignment',
        timestamp: now,
        read:      false,
      });
    }

    updateState({ tasks: [...(tasks || []), newTask] });
    if (newNotifs.length) {
      updateState({ notifications: [...newNotifs, ...(state.notifications || [])] });
    }
    toast.success(`"${taskTitle}" added to ${activeDepartment} queue.`);
    setTaskTitle(''); setAssigneeId('');
    setScheduledDate(''); setPriority('Medium'); setAttachmentUrl('');
    setNeedsBothRoles(false); setCoAssigneeId('');
  };

  const handleStatusChange = (taskId, nextStatus) => {
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t) return;
    if (t.status === 'Review' && nextStatus === 'In Progress') {
      setRevisionTaskId(taskId);
      setRevisionNote('');
      return;
    }
    doStatusChange(taskId, nextStatus, '');
  };

  const doStatusChange = (taskId, nextStatus, revisionReason) => {
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedTasks = (tasks || []).map(x =>
      x.id === taskId ? {
        ...x,
        status: nextStatus,
        revisionCount: revisionReason ? (x.revisionCount || 0) + 1 : (x.revisionCount || 0),
      } : x
    );

    const statusNotifs = [];
    if (t.assignedBy && t.assignedBy !== user.id) {
      statusNotifs.push({
        id:        genId('NTF'),
        userId:    t.assignedBy,
        message:   `${user.name} moved "${t.title}" from "${t.status}" to "${nextStatus}".`,
        type:      'info',
        timestamp: now,
        read:      false,
      });
    }

    // ponytail: skip bulk saveTasks (triggers Realtime race that reverts the optimistic update).
    // Use targeted updateTask for single-row persist instead.
    updateState({
      tasks: updatedTasks,
      ...(statusNotifs.length ? { notifications: [...statusNotifs, ...(state.notifications || [])] } : {}),
    }, new Set(['tasks']));

    const rc = revisionReason ? (t.revisionCount || 0) + 1 : (t.revisionCount || 0);
    db.updateTask(taskId, { status: nextStatus, revisionCount: rc }).catch(err =>
      console.error('[doStatusChange] Failed to persist task:', err)
    );

    toast.success(`Task moved to ${nextStatus}.`);
  };

  const handleSubmitRevision = (e) => {
    e.preventDefault();
    if (!revisionTaskId || !revisionNote.trim()) return;
    doStatusChange(revisionTaskId, 'In Progress', revisionNote.trim());
    setRevisionTaskId(null);
    setRevisionNote('');
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };
  const handleDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragOverCol(null); };
  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t || t.status === targetStatus) return;
    handleStatusChange(taskId, targetStatus);
  };

  const handleOpenDetail = (task) => setSelectedTask(task);

  const canDelegate = (task) =>
    canAssignTasks &&
    task.sourceDept === 'Social Media' &&
    task.assignedBy === user.id;

  // ── Reassign handler ──────────────────────────────────────────────────────
  const handleReassignSubmit = (e, taskId) => {
    e.preventDefault();
    if (!reassignEmpId) return;
    const task = tasks.find(t => t.id === taskId);
    const staffMember = employees.find(emp => emp.id === reassignEmpId);
    const origTitle = task?.title;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    updateState({
      tasks: tasks.map(t =>
        t.id === taskId ? { ...t, assignedTo: reassignEmpId, assigneeName: staffMember?.name || '' } : t
      ),
      notifications: [{
        id: genId('NTF'),
        userId: reassignEmpId,
        message: `${user.name} reassigned task "${origTitle}" to you.`,
        type: 'assignment',
        timestamp: now,
        read: false,
      }, ...(state.notifications || [])],
    });

    db.updateTask(taskId, { assignedTo: reassignEmpId, assigneeName: staffMember?.name || '' }).catch(err =>
      console.error('[Creative] Failed to persist reassign:', err)
    );

    toast.success(`Task reassigned to ${staffMember?.name}.`, `"${origTitle}"`);
    setReassignTaskId(null); setReassignEmpId('');
  };

  // ── Edit task handler ─────────────────────────────────────────────────────
  const handleEditTask = (task) => {
    setEditTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDue(task.dueDate || '');
    setEditAssignee(task.assignedTo);
    setEditAssignee2(task.assignedTo2 || '');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editAssignee) return;
    const staffMember = employees.find(e => e.id === editAssignee);
    updateState({
      tasks: tasks.map(t =>
        t.id === editTaskId ? {
          ...t,
          title: editTitle,
          assignedTo: editAssignee,
          assigneeName: staffMember?.name || '',
          assignedTo2: editAssignee2 || null,
          assigneeName2: editAssignee2 ? employees.find(e => e.id === editAssignee2)?.name || '' : '',
          priority: editPriority,
          dueDate: editDue,
        } : t
      ),
    });

    db.updateTask(editTaskId, {
      title: editTitle,
      assignedTo: editAssignee,
      assigneeName: staffMember?.name || '',
      assignedTo2: editAssignee2 || null,
      assigneeName2: editAssignee2 ? employees.find(e => e.id === editAssignee2)?.name || '' : '',
      priority: editPriority,
      dueDate: editDue,
    }).catch(err => console.error('[Creative] Failed to persist edit:', err));

    toast.success('Task updated.');
    setEditTaskId(null);
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const taskTitle = task?.title;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    updateState({
      tasks: tasks.filter(t => t.id !== taskId),
      auditLogs: [{
        id: genId('AUD'),
        userId: user.id,
        action: 'Task Deleted',
        details: `${user.name} deleted task "${taskTitle}".`,
        timestamp: now,
      }, ...(state.auditLogs || [])],
    });

    db.deleteTask(taskId).catch(err =>
      console.error('[Creative] Failed to delete task from database:', err)
    );

    toast.success('Task deleted.');
    setDeleteTaskId(null);
  };

  const handleDelegate = (e) => {
    e.preventDefault();
    if (!delegateTaskId || !delegateEmpId) return;
    const delegateTo = employees.find(emp => emp.id === delegateEmpId);
    if (!delegateTo) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const task = tasks.find(t => t.id === delegateTaskId);

    updateState({
      tasks: tasks.map(t =>
        t.id === delegateTaskId
          ? { ...t, assignedTo: delegateEmpId, assigneeName: delegateTo.name }
          : t
      ),
      notifications: [{
        id: genId('NTF'),
        userId: delegateEmpId,
        message: `📌 Manager ${user.name} delegated a Social Media task to you: "${task?.title}"`,
        type: 'assignment',
        timestamp: now,
        read: false,
      }, ...(state.notifications || [])],
    });

    toast.success(`Task delegated to ${delegateTo.name}`);
    setDelegateTaskId(null);
    setDelegateEmpId('');
  };

  const DeptIcon = activeDepartment === 'Video Editors' ? Film
    : activeDepartment === 'Graphic Designers' ? Image
    : Camera;

  // ── Shoot approval handlers (Videography only) ─────────────────────────
  const canApproveShoot = (task) =>
    activeDepartment === 'Videography/Photography'
    && task.sourceDept === 'Social Media'
    && task.shootApprovalStatus === 'pending'
    && task.assignedTo === user.id
    && task.status === 'New';

  const handleApproveShoot = (taskId) => {
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedTasks = (tasks || []).map(x =>
      x.id === taskId ? { ...x, shootApprovalStatus: 'approved' } : x
    );

    const notifs = [];
    if (t.assignedBy && t.assignedBy !== user.id) {
      notifs.push({
        id: genId('NTF'),
        userId: t.assignedBy,
        message: `✅ ${user.name} approved the shoot date for "${t.title}" (due ${t.dueDate}).`,
        type: 'info',
        timestamp: now,
        read: false,
      });
    }

    updateState({
      tasks: updatedTasks,
      ...(notifs.length ? { notifications: [...notifs, ...(state.notifications || [])] } : {}),
    });
    toast.success(`Shoot date approved for "${t.title}".`);
  };

  const handleReschedule = (e) => {
    e.preventDefault();
    if (!rescheduleTaskId || !rescheduleDate || !rescheduleReason.trim()) return;
    const t = (tasks || []).find(x => x.id === rescheduleTaskId);
    if (!t) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedTasks = (tasks || []).map(x =>
      x.id === rescheduleTaskId ? {
        ...x,
        shootApprovalStatus: 'reschedule_requested',
        rescheduleRequest: {
          proposedDate: rescheduleDate,
          reason: rescheduleReason.trim(),
          requestedBy: user.id,
          requestedByName: user.name,
          requestedAt: now,
        },
      } : x
    );

    const notifs = [];
    if (t.assignedBy && t.assignedBy !== user.id) {
      notifs.push({
        id: genId('NTF'),
        userId: t.assignedBy,
        message: `📅 ${user.name} requested reschedule for "${t.title}": new date ${rescheduleDate} — "${rescheduleReason.trim().substring(0, 80)}"`,
        type: 'info',
        timestamp: now,
        read: false,
      });
    }

    updateState({
      tasks: updatedTasks,
      ...(notifs.length ? { notifications: [...notifs, ...(state.notifications || [])] } : {}),
    });
    toast.success(`Reschedule requested for "${t.title}".`);
    setRescheduleTaskId(null);
    setRescheduleDate('');
    setRescheduleReason('');
  };

  // ── Delay reporting handler ─────────────────────────────────────────────
  const canReportDelay = (task) =>
    task.status !== 'Completed'
    && task.assignedTo === user.id
    && task.dueDate
    && task.dueDate <= todayStr();

  const handleReportDelay = (e) => {
    e.preventDefault();
    if (!delayTaskId || !delayReason.trim() || !delayNewDueDate) return;
    const t = (tasks || []).find(x => x.id === delayTaskId);
    if (!t) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const delayEntry = {
      reason: delayReason.trim(),
      previousDueDate: t.dueDate,
      newDueDate: delayNewDueDate,
      reportedBy: user.id,
      reportedByName: user.name,
      reportedAt: now,
    };

    const updatedTasks = (tasks || []).map(x =>
      x.id === delayTaskId ? {
        ...x,
        isDelayed: true,
        delayCount: (x.delayCount || 0) + 1,
        delayHistory: [...(x.delayHistory || []), delayEntry],
        dueDate: delayNewDueDate,
      } : x
    );

    const notifs = [];
    if (t.assignedBy && t.assignedBy !== user.id) {
      notifs.push({
        id: genId('NTF'),
        userId: t.assignedBy,
        message: `⏰ ${user.name} reported a delay on "${t.title}": "${delayReason.trim().substring(0, 100)}" — new due date: ${delayNewDueDate}`,
        type: 'info',
        timestamp: now,
        read: false,
      });
    }

    updateState({
      tasks: updatedTasks,
      ...(notifs.length ? { notifications: [...notifs, ...(state.notifications || [])] } : {}),
      auditLogs: [{
        id: genId('AUD'),
        userId: user.id,
        action: 'Task Delayed',
        details: `${user.name} delayed "${t.title}" from ${t.dueDate} to ${delayNewDueDate}. Reason: ${delayReason.trim()}`,
        timestamp: now,
      }, ...(state.auditLogs || [])],
    });
    toast.success(`Delay reported for "${t.title}". New due date: ${delayNewDueDate}.`);
    setDelayTaskId(null);
    setDelayReason('');
    setDelayNewDueDate('');
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Full-width Kanban
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] animate-fade-in gap-0">

      {/* ── Row 1: Board identity ── */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <div className="p-2.5 bg-fuchsia-500/10 rounded-xl text-fuchsia-400 ring-1 ring-fuchsia-500/20">
          <DeptIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">{activeDepartment}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{deptTasks.length} task{deptTasks.length !== 1 ? 's' : ''} · {employees.filter(e => e.department?.includes(activeDepartment)).length} members</p>
        </div>
      </div>

      {/* ── Row 2: Controls ── */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 mb-3 md:mb-4 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/60 shadow-inner">
          {[
            { label: 'All', val: 'all' },
            { label: 'Mine', val: 'mine' },
            { label: 'Overdue', val: 'overdue' },
            { label: 'Today', val: 'today' },
          ].map(f => (
            <button key={f.val} onClick={() => setQuickFilter(f.val)}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg text-3xs sm:text-xs font-bold tracking-wide transition-all duration-150 ${
                quickFilter === f.val ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 relative ml-auto">
          <button onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
              showCompleted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border border-transparent'
            }`} title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}>
            <span className={`w-1.5 h-1.5 rounded-full ${showCompleted ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {showCompleted ? 'Completed' : 'Hidden'}
          </button>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition ${
              showFilters ? 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`} title="Filters & Legend">
            <Filter className="w-4 h-4" />
          </button>

          {showFilters && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-20 w-64 glass-panel rounded-xl p-4 shadow-2xl border border-slate-700/60 animate-fade-in">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Priority</h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Emergency', dot: 'bg-red-500' },
                        { label: 'High', dot: 'bg-rose-500' },
                        { label: 'Medium', dot: 'bg-amber-500' },
                        { label: 'Low', dot: 'bg-slate-500' },
                      ].map(p => (
                        <span key={p.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className={`w-2 h-2 rounded-full ${p.dot}`} /> {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Departments</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(DEPT_DOT).map(([dept, dot]) => (
                        <span key={dept} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className={`w-2 h-2 rounded-full ${dot}`} /> {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {canAssignTasks && (
            <button onClick={() => setShowTaskForm(true)}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-fuchsia-500/20 transition-all duration-150 hover:shadow-fuchsia-500/30" title="Add task">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban columns ── */}
      <div ref={kanbanRef} tabIndex={0} onKeyDown={handleKanbanKeyDown}
        className="flex-1 flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 min-h-0 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden focus:outline-none snap-x snap-mandatory md:snap-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {COLUMNS.map(col => {
          const colTasks = columns[col] || [];
          const overdue = overdueCount(colTasks);
          const style = COLUMN_STYLES[col];
          const isOver = dragOverCol === col;
          const isColFocused = focusedCol === col;
          return (
            <div key={col}
              className={`flex flex-col min-h-0 rounded-xl border ${style.borderCol} ${style.panelBg} ${isOver ? 'ring-2 ring-fuchsia-500/50' : ''} ${isColFocused ? 'ring-2 ring-fuchsia-400/60 shadow-lg shadow-fuchsia-500/10' : ''} snap-start min-w-[80vw] sm:min-w-[60vw] md:min-w-0 shrink-0 md:shrink`}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className={`px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-800/40 flex items-center justify-between flex-shrink-0 ${style.glow || ''}`}>
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-xs font-extrabold uppercase tracking-[0.12em] ${style.header}`}>{col}</h3>
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${style.header} bg-slate-800/50`}>{colTasks.length}</span>
                </div>
                {overdue > 0 && (
                  <span className="text-3xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {overdue} overdue
                  </span>
                )}
              </div>

              <div className="flex-1 p-2 md:p-3 space-y-2.5 md:space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-16 border border-dashed border-slate-800/60 rounded-lg mt-1">
                    <AlertCircle className="w-4 h-4 text-slate-600 mb-1" />
                    <p className="text-3xs text-slate-600">Drop tasks here</p>
                  </div>
                ) : (
                    colTasks.map((task, idx) => {
                    const assignee = employees.find(e => e.id === task.assignedTo);
                    const assignee2 = task.assignedTo2 ? employees.find(e => e.id === task.assignedTo2) : null;
                    const assigner = employees.find(e => e.id === task.assignedBy);
                    const isOverdue = task.dueDate && task.dueDate < todayStr() && task.status !== 'Completed';
                    const isDueToday = task.dueDate === todayStr() && task.status !== 'Completed';
                    const isTaskFocused = focusedCol === col && focusedTaskIdx === idx;
                    const priorityDot = task.priority === 'Emergency' ? 'bg-red-500'
                      : task.priority === 'High' ? 'bg-rose-500'
                      : task.priority === 'Medium' ? 'bg-amber-500'
                      : 'bg-slate-500';
                    const sourceDeptColor = DEPT_DOT[task.sourceDept] || 'bg-slate-500';
                    return (
                      <div key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`cursor-grab active:cursor-grabbing ${isTaskFocused ? 'z-10' : ''}`}
                      >
                        <div
                          onClick={() => { handleOpenDetail(task); setFocusedCol(null); setFocusedTaskIdx(null); }}
                          className={`glass-card p-3 md:p-2.5 md:pl-2 rounded-xl border-l-[3px] transition-all duration-200 hover:border-l-fuchsia-400 hover:bg-fuchsia-500/[0.02] hover:shadow-lg hover:shadow-fuchsia-500/5 cursor-pointer active:scale-[0.98] ${
                            isOverdue ? 'border-l-rose-500 bg-rose-500/[0.04]' :
                            isDueToday ? 'border-l-amber-500 bg-amber-500/[0.04]' :
                            'border-l-fuchsia-500/40'
                          } ${isTaskFocused ? 'ring-2 ring-fuchsia-400/70 shadow-lg shadow-fuchsia-500/20 border-fuchsia-400/60' : ''}`}
                        >
                          {/* Drag handle + Title row */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-slate-600 hover:text-slate-400 flex-shrink-0 mr-0.5" title="Drag to reorder">
                              <GripVertical className="w-4 h-4" />
                            </span>
                            {task.priority && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot}`} title={task.priority} />}
                            <span className="text-sm md:text-sm font-semibold text-slate-100 truncate leading-tight flex-1">{task.title}</span>
                            {task.revisionCount > 0 && <span className="text-xs text-amber-400 font-bold flex-shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded" title={`Revision ${task.revisionCount}`}>R{task.revisionCount}</span>}
                          </div>

                          {/* Compact change request banner */}
                          {task.changeRequest && (
                            <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-1.5 mb-2">
                              <p className="text-xs text-amber-300/80 leading-relaxed line-clamp-1">{task.changeRequest}</p>
                            </div>
                          )}

                          {/* Reschedule request preview */}
                          {task.rescheduleRequest && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 mb-2">
                              <p className="text-xs text-amber-300 font-semibold">Reschedule → {task.rescheduleRequest.proposedDate}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{task.rescheduleRequest.reason}</p>
                            </div>
                          )}

                          {/* Source department badge */}
                          {task.sourceDept && task.sourceDept !== activeDepartment && (
                            <div className="flex items-center gap-1 mb-2">
                              <span className={`w-2 h-2 rounded-full ${sourceDeptColor}`} />
                              <span className="text-xs text-slate-500 font-medium">from {task.sourceDept}</span>
                            </div>
                          )}

                          {/* Assigned by / Assigned to row */}
                          <div className="flex items-center justify-between text-xs md:text-sm text-slate-500 mb-1.5">
                            {assigner ? (
                              <span className="flex items-center gap-1" title={`Assigned by ${assigner.name}`}>
                                <User className="w-3.5 h-3.5 text-slate-600" /> {assigner.name.split(' ')[0]}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-600" /> —
                              </span>
                            )}
                            <span className="text-slate-700">→</span>
                            {assignee ? (
                              <span className="flex items-center gap-1 font-medium text-slate-400" title={`Assigned to ${assignee.name}${assignee2 ? ` + ${assignee2.name}` : ''}`}>
                                <User className="w-3.5 h-3.5 text-teal-500" /> {assignee.name.split(' ')[0]}{assignee2 ? <span className="text-amber-400">+{assignee2.name.split(' ')[0]}</span> : ''}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-600 italic">Unassigned</span>
                            )}
                          </div>

                          {/* Date + attachment row */}
                          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
                            {task.dueDate && (
                              <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-rose-400 font-medium' : isDueToday ? 'text-amber-400 font-medium' : ''}`}>
                                {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                                {task.dueDate}
                              </span>
                            )}
                            {task.scheduledDate && task.scheduledDate !== task.dueDate && (
                              <span className="text-slate-600" title={`Post date: ${task.scheduledDate}`}>
                                📅 {task.scheduledDate}
                              </span>
                            )}
                            {task.attachmentUrl && (
                              <a href={task.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-0.5" title="Open attachment">
                                <LinkIcon className="w-3.5 h-3.5" /> Link
                              </a>
                            )}
                          </div>

                          {/* Status badges row */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {task.approvedAt && <span className="text-xs md:text-sm text-emerald-400 font-semibold">✓ done</span>}
                            {task.isDelayed && (
                              <span className="text-xs md:text-sm text-rose-400 font-semibold flex items-center gap-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded" title={`Delayed ${task.delayCount} time(s)`}>
                                <ClockAlert className="w-3.5 h-3.5" /> Delayed{task.delayCount > 1 ? ` x${task.delayCount}` : ''}
                              </span>
                            )}
                            {task.shootApprovalStatus === 'approved' && (
                              <span className="text-xs md:text-sm text-teal-400 font-semibold flex items-center gap-0.5">
                                <CalendarCheck className="w-3.5 h-3.5" /> Approved
                              </span>
                            )}
                            {task.shootApprovalStatus === 'reschedule_requested' && (
                              <span className="text-xs md:text-sm text-amber-400 font-semibold flex items-center gap-0.5">
                                <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                              </span>
                            )}
                            {task.shootApprovalStatus === 'pending' && task.sourceDept === 'Social Media' && (
                              <span className="text-xs md:text-sm text-orange-400 font-semibold flex items-center gap-0.5">
                                <CalendarClock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </div>

                          {/* Action row */}
                          <div className="flex gap-2 mt-2.5 flex-wrap">
                            {canReportDelay(task) && (
                              <button title="Report delay"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDelayTaskId(task.id);
                                  setDelayNewDueDate(addDays(task.dueDate, 1));
                                  setDelayReason('');
                                }}
                                className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 transition border border-rose-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                <ClockAlert className="w-5 h-5 md:w-4 md:h-4" />
                              </button>
                            )}
                            {canApproveShoot(task) && (
                              <>
                                <button title="Approve shoot date"
                                  onClick={(e) => { e.stopPropagation(); handleApproveShoot(task.id); }}
                                  className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-teal-600/15 hover:bg-teal-600/30 text-teal-400 transition border border-teal-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                  <CalendarCheck className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                                <button title="Request reschedule"
                                  onClick={(e) => { e.stopPropagation(); setRescheduleTaskId(task.id); setRescheduleDate(task.scheduledDate || task.dueDate || ''); setRescheduleReason(''); }}
                                  className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-amber-600/15 hover:bg-amber-600/30 text-amber-400 transition border border-amber-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                  <CalendarClock className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                              </>
                            )}
                            {canDelegate(task) && (
                              <button title="Delegate"
                                onClick={(e) => { e.stopPropagation(); setDelegateTaskId(task.id); setDelegateEmpId(task.assignedTo || ''); }}
                                className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 transition border border-fuchsia-500/15 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                <UserPlus className="w-5 h-5 md:w-4 md:h-4" />
                              </button>
                            )}
                            {canManageTask(task) && (
                              <>
                                <button title="Edit task"
                                  onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                  className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 transition border border-blue-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                  <Edit3 className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                                <button title="Reassign task"
                                  onClick={(e) => { e.stopPropagation(); setReassignTaskId(task.id); setReassignEmpId(task.assignedTo || ''); }}
                                  className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 transition border border-violet-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                  <RefreshCw className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                                <button title="Delete task"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                                  className="p-2.5 md:p-2 rounded-lg md:rounded-md bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 transition border border-rose-500/20 min-w-[40px] min-h-[40px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center">
                                  <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormModal
        showTaskForm={showTaskForm} setShowTaskForm={setShowTaskForm}
        canAssignTasks={canAssignTasks} handleAddTask={handleAddTask}
        taskTitle={taskTitle} setTaskTitle={setTaskTitle}
        priority={priority} setPriority={setPriority}
        daysPrior={daysPrior} setDaysPrior={setDaysPrior}
        subTypeFilter={subTypeFilter} setSubTypeFilter={setSubTypeFilter}
        assigneeId={assigneeId} setAssigneeId={setAssigneeId}
        needsBothRoles={needsBothRoles} setNeedsBothRoles={setNeedsBothRoles}
        coAssigneeId={coAssigneeId} setCoAssigneeId={setCoAssigneeId}
        scheduledDate={scheduledDate} setScheduledDate={setScheduledDate}
        attachmentUrl={attachmentUrl} setAttachmentUrl={setAttachmentUrl}
        creativeStaff={creativeStaff} coAssigneeStaff={coAssigneeStaff}
        activeDepartment={activeDepartment} tasks={tasks}
        getWorkloadInfo={getWorkloadInfo} formatWorkloadLabel={formatWorkloadLabel}
        addDays={addDays} todayStr={todayStr}
      />

      <RevisionModal
        revisionTaskId={revisionTaskId} setRevisionTaskId={setRevisionTaskId}
        revisionNote={revisionNote} setRevisionNote={setRevisionNote}
        handleSubmitRevision={handleSubmitRevision}
      />

      <DelegationModal
        delegateTaskId={delegateTaskId} setDelegateTaskId={setDelegateTaskId}
        delegateEmpId={delegateEmpId} setDelegateEmpId={setDelegateEmpId}
        handleDelegate={handleDelegate}
        tasks={tasks} creativeStaff={creativeStaff} user={user} activeDepartment={activeDepartment}
      />

      <RescheduleModal
        rescheduleTaskId={rescheduleTaskId} setRescheduleTaskId={setRescheduleTaskId}
        rescheduleDate={rescheduleDate} setRescheduleDate={setRescheduleDate}
        rescheduleReason={rescheduleReason} setRescheduleReason={setRescheduleReason}
        handleReschedule={handleReschedule}
        tasks={tasks}
      />

      <DelayReportModal
        delayTaskId={delayTaskId} setDelayTaskId={setDelayTaskId}
        delayReason={delayReason} setDelayReason={setDelayReason}
        delayNewDueDate={delayNewDueDate} setDelayNewDueDate={setDelayNewDueDate}
        handleReportDelay={handleReportDelay}
        tasks={tasks}
      />

      <ReassignModal
        reassignTaskId={reassignTaskId} setReassignTaskId={setReassignTaskId}
        reassignEmpId={reassignEmpId} setReassignEmpId={setReassignEmpId}
        handleReassignSubmit={handleReassignSubmit}
        tasks={tasks} employees={employees} activeDepartment={activeDepartment}
      />

      <EditTaskModal
        editTaskId={editTaskId} setEditTaskId={setEditTaskId}
        editTitle={editTitle} setEditTitle={setEditTitle}
        editPriority={editPriority} setEditPriority={setEditPriority}
        editDue={editDue} setEditDue={setEditDue}
        editAssignee={editAssignee} setEditAssignee={setEditAssignee}
        handleSaveEdit={handleSaveEdit}
        tasks={tasks} employees={employees}
      />

      <DeleteConfirmModal
        deleteTaskId={deleteTaskId} setDeleteTaskId={setDeleteTaskId}
        handleDeleteTask={handleDeleteTask}
        tasks={tasks}
      />

      {/* ── Task Detail Panel ── */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          state={state}
          updateState={updateState}
          currentUser={user}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

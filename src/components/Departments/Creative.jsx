import { useState, useMemo, useRef } from 'react';
import {
  Film, Image, Camera, Plus, AlertCircle, User, Link as LinkIcon,
  GitBranch, X, Filter, UserPlus, Edit3, GripVertical, RefreshCw, Trash2,
  CalendarCheck, CalendarClock, ClockAlert, CheckCircle,
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { genId, today as todayStr, addDays } from '../../lib/format';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import { DatePicker } from '../ui';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { db } from '../../data/db';

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
        className="flex-1 grid grid-cols-4 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 min-h-0 overflow-x-auto overflow-y-hidden md:overflow-y-auto md:overflow-x-hidden focus:outline-none snap-x snap-mandatory md:snap-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {COLUMNS.map(col => {
          const colTasks = columns[col] || [];
          const overdue = overdueCount(colTasks);
          const style = COLUMN_STYLES[col];
          const isOver = dragOverCol === col;
          const isColFocused = focusedCol === col;
          return (
            <div key={col}
              className={`flex flex-col min-h-0 rounded-xl border ${style.borderCol} ${style.panelBg} ${isOver ? 'ring-2 ring-fuchsia-500/50' : ''} ${isColFocused ? 'ring-2 ring-fuchsia-400/60 shadow-lg shadow-fuchsia-500/10' : ''} snap-start min-w-[70vw] md:min-w-0`}
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
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="text-slate-600 hover:text-slate-400 flex-shrink-0 mr-0.5" title="Drag to reorder">
                              <GripVertical className="w-3 h-3" />
                            </span>
                            {task.priority && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot}`} title={task.priority} />}
                            <span className="text-xs md:text-xs font-semibold text-slate-100 truncate leading-tight flex-1">{task.title}</span>
                            {task.revisionCount > 0 && <span className="text-3xs text-amber-400 font-bold flex-shrink-0 bg-amber-500/10 px-1 rounded" title={`Revision ${task.revisionCount}`}>R{task.revisionCount}</span>}
                          </div>

                          {/* Compact change request banner */}
                          {task.changeRequest && (
                            <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-1.5 mb-1.5">
                              <p className="text-3xs text-amber-300/80 leading-relaxed line-clamp-1">{task.changeRequest}</p>
                            </div>
                          )}

                          {/* Reschedule request preview */}
                          {task.rescheduleRequest && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 mb-1.5">
                              <p className="text-3xs text-amber-300 font-semibold">Reschedule → {task.rescheduleRequest.proposedDate}</p>
                              <p className="text-3xs text-slate-500 line-clamp-1">{task.rescheduleRequest.reason}</p>
                            </div>
                          )}

                          {/* Source department badge */}
                          {task.sourceDept && task.sourceDept !== activeDepartment && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sourceDeptColor}`} />
                              <span className="text-3xs text-slate-500 font-medium">from {task.sourceDept}</span>
                            </div>
                          )}

                          {/* Assigned by / Assigned to row */}
                          <div className="flex items-center justify-between text-2xs md:text-3xs text-slate-500 mb-1">
                            {assigner ? (
                              <span className="flex items-center gap-1" title={`Assigned by ${assigner.name}`}>
                                <User className="w-2.5 h-2.5 text-slate-600" /> {assigner.name.split(' ')[0]}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5 text-slate-600" /> —
                              </span>
                            )}
                            <span className="text-slate-700">→</span>
                            {assignee ? (
                              <span className="flex items-center gap-1 font-medium text-slate-400" title={`Assigned to ${assignee.name}${assignee2 ? ` + ${assignee2.name}` : ''}`}>
                                <User className="w-2.5 h-2.5 text-teal-500" /> {assignee.name.split(' ')[0]}{assignee2 ? <span className="text-amber-400">+{assignee2.name.split(' ')[0]}</span> : ''}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-600 italic">Unassigned</span>
                            )}
                          </div>

                          {/* Date + attachment row */}
                          <div className="flex items-center gap-2 text-2xs md:text-3xs text-slate-500">
                            {task.dueDate && (
                              <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-rose-400 font-medium' : isDueToday ? 'text-amber-400 font-medium' : ''}`}>
                                {isOverdue && <AlertCircle className="w-2.5 h-2.5" />}
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
                                <LinkIcon className="w-2.5 h-2.5" /> Link
                              </a>
                            )}
                          </div>

                          {/* Status badges row */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {task.approvedAt && <span className="text-2xs md:text-3xs text-emerald-400 font-semibold">✓ done</span>}
                            {task.isDelayed && (
                              <span className="text-3xs text-rose-400 font-semibold flex items-center gap-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded" title={`Delayed ${task.delayCount} time(s)`}>
                                <ClockAlert className="w-2.5 h-2.5" /> Delayed{task.delayCount > 1 ? ` x${task.delayCount}` : ''}
                              </span>
                            )}
                            {task.shootApprovalStatus === 'approved' && (
                              <span className="text-3xs text-teal-400 font-semibold flex items-center gap-0.5">
                                <CalendarCheck className="w-2.5 h-2.5" /> Approved
                              </span>
                            )}
                            {task.shootApprovalStatus === 'reschedule_requested' && (
                              <span className="text-3xs text-amber-400 font-semibold flex items-center gap-0.5">
                                <CalendarClock className="w-2.5 h-2.5" /> Reschedule
                              </span>
                            )}
                            {task.shootApprovalStatus === 'pending' && task.sourceDept === 'Social Media' && (
                              <span className="text-3xs text-orange-400 font-semibold flex items-center gap-0.5">
                                <CalendarClock className="w-2.5 h-2.5" /> Pending
                              </span>
                            )}
                          </div>

                          {/* Action row */}
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {canReportDelay(task) && (
                              <button title="Report delay"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDelayTaskId(task.id);
                                  setDelayNewDueDate(addDays(task.dueDate, 1));
                                  setDelayReason('');
                                }}
                                className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 transition border border-rose-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                <ClockAlert className="w-4 h-4 md:w-3.5 md:h-3.5" />
                              </button>
                            )}
                            {canApproveShoot(task) && (
                              <>
                                <button title="Approve shoot date"
                                  onClick={(e) => { e.stopPropagation(); handleApproveShoot(task.id); }}
                                  className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-teal-600/15 hover:bg-teal-600/30 text-teal-400 transition border border-teal-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                  <CalendarCheck className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                                <button title="Request reschedule"
                                  onClick={(e) => { e.stopPropagation(); setRescheduleTaskId(task.id); setRescheduleDate(task.scheduledDate || task.dueDate || ''); setRescheduleReason(''); }}
                                  className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-amber-600/15 hover:bg-amber-600/30 text-amber-400 transition border border-amber-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                  <CalendarClock className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                              </>
                            )}
                            {canDelegate(task) && (
                              <button title="Delegate"
                                onClick={(e) => { e.stopPropagation(); setDelegateTaskId(task.id); setDelegateEmpId(task.assignedTo || ''); }}
                                className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-400 transition border border-fuchsia-500/15 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                <UserPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                              </button>
                            )}
                            {canManageTask(task) && (
                              <>
                                <button title="Edit task"
                                  onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                  className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 transition border border-blue-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                  <Edit3 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                                <button title="Reassign task"
                                  onClick={(e) => { e.stopPropagation(); setReassignTaskId(task.id); setReassignEmpId(task.assignedTo || ''); }}
                                  className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 transition border border-violet-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                                <button title="Delete task"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                                  className="p-2 md:p-1.5 rounded-lg md:rounded-md bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 transition border border-rose-500/20 min-w-[36px] min-h-[36px] md:min-w-[28px] md:min-h-[28px] flex items-center justify-center">
                                  <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
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

      {/* ── Task form modal ── */}
      {showTaskForm && (
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
      )}

      {/* ── Revision modal ── */}
      {revisionTaskId && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setRevisionTaskId(null)} />
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
            <div className="glass-panel border border-amber-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-amber-400" />
                Revision Note
              </h3>
              <p className="text-sm text-slate-400">Why is this task being sent back from Review?</p>
              <form onSubmit={handleSubmitRevision} className="space-y-4">
                <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm h-24" placeholder="Describe what needs to change..." required autoFocus />
                <div className="flex gap-2">
                  <button type="submit" className="bg-amber-600 hover:bg-amber-700 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition flex items-center gap-2">
                    <GitBranch className="w-4 h-4" /> Send Back (Revision)
                  </button>
                  <button type="button" onClick={() => { setRevisionTaskId(null); setRevisionNote(''); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Delegation modal ── */}
      {delegateTaskId && (() => {
        const task = tasks.find(t => t.id === delegateTaskId);
        return (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => { setDelegateTaskId(null); setDelegateEmpId(''); }} />
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
              <div className="glass-panel border border-fuchsia-500/20 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[80vh] md:max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4"
                onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-fuchsia-400" />
                  Delegate Task
                </h3>
                <p className="text-sm text-slate-400">
                  Delegate <span className="text-slate-200 font-semibold">"{task?.title}"</span> to a {activeDepartment} team member.
                </p>
                <form onSubmit={handleDelegate} className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Assign to</label>
                    <select value={delegateEmpId} onChange={e => setDelegateEmpId(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                      <option value="">— Choose member —</option>
                      {creativeStaff
                        .filter(s => s.id !== user.id)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit"
                      className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-600 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-fuchsia-500/20 transition-all duration-150">
                      <UserPlus className="w-4 h-4 inline mr-1.5" /> Delegate
                    </button>
                    <button type="button"
                      onClick={() => { setDelegateTaskId(null); setDelegateEmpId(''); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Reschedule modal ── */}
      {rescheduleTaskId && (() => {
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
      })()}

      {/* ── Delay report modal ── */}
      {delayTaskId && (() => {
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
      })()}

      {/* ── Reassign modal ── */}
      {reassignTaskId && (() => {
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
      })()}

      {/* ── Edit task modal ── */}
      {editTaskId && (() => {
        const task = tasks.find(t => t.id === editTaskId);
        const taskDeptStaff = employees.filter(e => e.department?.includes(task?.department || activeDepartment));
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
      })()}

      {/* ── Delete confirmation modal ── */}
      {deleteTaskId && (() => {
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
      })()}

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

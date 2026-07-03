import React, { useState, useMemo } from 'react';
import { Film, Image, Camera, Plus, AlertCircle, User, Link as LinkIcon, GitBranch, Calendar as CalendarIcon, X, ChevronRight } from 'lucide-react';
import { useToast } from '../shared/Toast';
import TaskCard from '../shared/TaskCard';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import DeptCalendar from '../shared/DeptCalendar';
import PersonalCalendar from '../shared/PersonalCalendar';
import { DatePicker } from '../ui';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';

const COLUMNS = ['New', 'In Progress', 'Review', 'Completed'];

const COLUMN_STYLES = {
  'New':         { border: 'border-l-violet-500',      header: 'text-violet-400', bg: 'bg-violet-500/5' },
  'In Progress': { border: 'border-l-blue-500',        header: 'text-blue-400',   bg: 'bg-blue-500/5' },
  'Review':      { border: 'border-l-amber-500',       header: 'text-amber-400',  bg: 'bg-amber-500/5' },
  'Completed':   { border: 'border-l-emerald-500',     header: 'text-emerald-400',bg: 'bg-emerald-500/5' },
};

export default function Creative({ user, state, updateState, activeDepartment }) {
  const { tasks, employees, taskComments } = state;
  const toast = useToast();

  const canAssignTasks = user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin' || user.department?.includes('Social Media');

  const creativeStaff = employees.filter(emp => emp.department?.includes(activeDepartment));

  // ── Form state ──────────────────────────────────────────────────────────
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [daysPrior, setDaysPrior] = useState('3');
  const [assigneeId, setAssigneeId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  // ── Timeline filter ─────────────────────────────────────────────────────
  const [timelineFilter, setTimelineFilter] = useState('all');

  // ── Detail panel ────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState(null);

  // ── View toggle: kanban vs calendar ─────────────────────────────────────
  const [viewMode, setViewMode] = useState('kanban');

  // ── Revision prompt ─────────────────────────────────────────────────────
  const [revisionTaskId, setRevisionTaskId] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');

  // ── Drag state ──────────────────────────────────────────────────────────
  const [dragOverCol, setDragOverCol] = useState(null);

  // ── Filter tasks by department + timeline ───────────────────────────────
  const deptTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      const matchesDept = task.department === activeDepartment;
      const matchesTimeline = timelineFilter === 'all'
        ? true
        : String(task.deadlineDaysPrior) === timelineFilter;
      return matchesDept && matchesTimeline;
    });
  }, [tasks, activeDepartment, timelineFilter]);

  // ── Tasks grouped by column ─────────────────────────────────────────────
  const columns = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(c => { grouped[c] = []; });
    deptTasks.forEach(t => {
      const col = COLUMNS.includes(t.status) ? t.status : 'New';
      grouped[col].push(t);
    });
    return grouped;
  }, [deptTasks]);

  // ── Count overdue tasks per column ──────────────────────────────────────
  const todayStr = () => new Date().toISOString().split('T')[0];
  const overdueCount = (colTasks) =>
    colTasks.filter(t => t.dueDate && t.dueDate < todayStr() && t.status !== 'Completed').length;

  // ── Comment counts ─────────────────────────────────────────────────────
  const commentCounts = useMemo(() => {
    const counts = {};
    (taskComments || []).forEach(c => {
      counts[c.taskId] = (counts[c.taskId] || 0) + 1;
    });
    return counts;
  }, [taskComments]);

  // ── Date helpers ────────────────────────────────────────────────────────
  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split('T')[0];
  };

  // ── Add task ────────────────────────────────────────────────────────────
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !assigneeId) return;

    // Compute approximate due date from deadlineDaysPrior
    const effectiveDueDate = scheduledDate
      ? addDays(scheduledDate, -parseInt(daysPrior))
      : addDays(todayStr(), parseInt(daysPrior));

    // ── Workload cap check ──
    if (assigneeId && effectiveDueDate) {
      const info = getWorkloadInfo(tasks, assigneeId, effectiveDueDate, activeDepartment, priority);
      if (!info.canAssign) {
        toast.error(info.reason);
        return;
      }
    }

    const assignee = employees.find(e => e.id === assigneeId);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTask = {
      id:                `CT${Date.now()}`,
      title:             taskTitle.trim(),
      description:       taskDescription.trim(),
      department:        activeDepartment,
      deadlineDaysPrior: parseInt(daysPrior),
      assignedTo:        assigneeId,
      assigneeName:      assignee?.name || '',
      assignedBy:        user.id,
      priority:          priority,
      status:            'New',
      dueDate:           effectiveDueDate,
      scheduledDate:     scheduledDate || null,
      attachmentUrl:     attachmentUrl.trim() || null,
      revisionCount:     0,
      createdAt:         now,
    };

    updateState({ tasks: [...(tasks || []), newTask] });
    if (assignee) {
      updateState({ notifications: [{
        id:        `NTF${Date.now()}`,
        userId:    assigneeId,
        message:   `${user.name} assigned you a task: "${taskTitle.trim()}"`,
        type:      'assignment',
        timestamp: now,
        read:      false,
      }, ...(state.notifications || [])] });
    }
    toast.success(`"${taskTitle}" added to ${activeDepartment} queue.`);
    setTaskTitle(''); setTaskDescription(''); setAssigneeId('');
    setScheduledDate(''); setPriority('Medium'); setAttachmentUrl('');
  };

  // ── Status change handler ───────────────────────────────────────────────
  const handleStatusChange = (taskId, nextStatus) => {
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t) return;

    // If moving from Review → In Progress, prompt for revision reason
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
        id:        `NTF${Date.now()}`,
        userId:    t.assignedBy,
        message:   `${user.name} moved "${t.title}" from "${t.status}" to "${nextStatus}".`,
        type:      'info',
        timestamp: now,
        read:      false,
      });
    }

    const updates = {
      tasks: updatedTasks,
      ...(statusNotifs.length ? { notifications: [...statusNotifs, ...(state.notifications || [])] } : {}),
    };

    // If revision, add a comment to the thread
    if (revisionReason) {
      const revisionComment = {
        id:        `CMT${Date.now()}`,
        taskId:    taskId,
        userId:    user.id,
        comment:   `Revision note: ${revisionReason}`,
        createdAt: new Date().toISOString(),
      };
      updates.taskComments = [revisionComment, ...(taskComments || [])];
    }

    updateState(updates);
    toast.success(`Task moved to ${nextStatus}.`);
  };

  // ── Submit revision note ────────────────────────────────────────────────
  const handleSubmitRevision = (e) => {
    e.preventDefault();
    if (!revisionTaskId || !revisionNote.trim()) return;
    doStatusChange(revisionTaskId, 'In Progress', revisionNote.trim());
    setRevisionTaskId(null);
    setRevisionNote('');
  };

  // ── Drag and drop ───────────────────────────────────────────────────────
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const t = (tasks || []).find(x => x.id === taskId);
    if (!t || t.status === targetStatus) return;
    handleStatusChange(taskId, targetStatus);
  };

  // ── Open detail panel ───────────────────────────────────────────────────
  const handleOpenDetail = (task) => {
    setSelectedTask(task);
  };

  const DeptIcon = activeDepartment === 'Video Editors' ? Film
    : activeDepartment === 'Graphic Designers' ? Image
    : Camera;

  // ── Sidebar state ─────────────────────────────────────────────────────
  const [sidebar, setSidebar] = useState(null); // 'calendar' | 'taskForm' | null

  return (
    <div className="flex gap-0 h-[calc(100vh-6rem)] animate-fade-in relative">

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 p-4 overflow-hidden">

        {/* ── Header ── */}
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
              <DeptIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{activeDepartment}</h2>
              <p className="text-xs text-slate-400">{deptTasks.length} task{deptTasks.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'kanban' && (
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                {[
                  { label: 'All', val: 'all' },
                  { label: '3D', val: '3' },
                  { label: '4D', val: '4' },
                  { label: '12D',val: '12' },
                ].map(f => (
                  <button key={f.val} onClick={() => setTimelineFilter(f.val)}
                    className={`px-2 py-1 rounded-md text-3xs font-medium transition ${
                      timelineFilter === f.val ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setSidebar(sidebar === 'calendar' ? null : 'calendar')}
              className={`p-2 rounded-lg transition ${
                sidebar === 'calendar' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`} title="Calendar sidebar">
              <CalendarIcon className="w-4 h-4" />
            </button>
            {canAssignTasks && (
              <button onClick={() => setSidebar(sidebar === 'taskForm' ? null : 'taskForm')}
                className={`p-2 rounded-lg transition ${
                  sidebar === 'taskForm' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`} title="Add task">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Kanban columns (full width) ── */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-h-0 overflow-hidden">
          {COLUMNS.map(col => {
            const colTasks = columns[col] || [];
            const overdue = overdueCount(colTasks);
            const style = COLUMN_STYLES[col];
            const isOver = dragOverCol === col;
            return (
              <div key={col}
                className={`glass-panel rounded-xl flex flex-col min-h-0 border-l-4 ${style.border} ${isOver ? 'ring-2 ring-violet-500/50' : ''}`}
                onDragOver={(e) => handleDragOver(e, col)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col)}
              >
                {/* Column header */}
                <div className={`px-3 py-2.5 border-b border-slate-800/60 flex items-center justify-between ${style.bg} rounded-t-xl flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-bold ${style.header}`}>{col}</h3>
                    <span className="text-3xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  {overdue > 0 && (
                    <span className="text-3xs text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-2.5 h-2.5" /> {overdue}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-16 border border-dashed border-slate-800 rounded-lg mt-2">
                      <p className="text-3xs text-slate-600">Drop tasks here</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const assignee = employees.find(e => e.id === task.assignedTo);
                      const cCount = commentCounts[task.id] || 0;
                      const isOverdue = task.dueDate && task.dueDate < todayStr() && task.status !== 'Completed';
                      const isDueToday = task.dueDate === todayStr() && task.status !== 'Completed';
                      return (
                        <div key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          {/* ── Slim card ── */}
                          <div
                            onClick={() => handleOpenDetail(task)}
                            className={`glass-card p-2.5 rounded-lg border-l-2 transition hover:border-l-violet-400 cursor-pointer ${
                              isOverdue ? 'border-l-rose-500 bg-rose-500/5' :
                              isDueToday ? 'border-l-amber-500 bg-amber-500/5' :
                              'border-l-violet-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-100 truncate">{task.title}</span>
                              {task.priority && (
                                <span className={`text-3xs px-1 py-0.5 rounded font-bold flex-shrink-0 ${
                                  task.priority === 'Emergency' ? 'bg-red-600/20 text-red-400' :
                                  task.priority === 'High' ? 'bg-rose-500/15 text-rose-400' :
                                  task.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                                  'bg-slate-500/15 text-slate-400'
                                }`}>{task.priority}</span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-3xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-3xs text-slate-500">
                              {assignee && (
                                <span className="flex items-center gap-0.5">
                                  <User className="w-2.5 h-2.5" /> {assignee.name.split(' ')[0]}
                                </span>
                              )}
                              {task.dueDate && <span>{task.dueDate}</span>}
                              {cCount > 0 && (
                                <span className="text-violet-400 font-semibold">{cCount}c</span>
                              )}
                              {task.revisionCount > 0 && (
                                <span className="text-amber-400">R{task.revisionCount}</span>
                              )}
                              {task.attachmentUrl && (
                                <LinkIcon className="w-2.5 h-2.5 text-violet-400" />
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
      </div>

      {/* ── Slide-in sidebar ── */}
      {sidebar && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebar(null)} />
          <div className={`w-full max-w-md bg-slate-900/95 border-l border-slate-800 overflow-y-auto flex-shrink-0 z-40
            fixed right-0 top-0 h-full lg:static lg:h-auto`}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-bold text-slate-100">
                {sidebar === 'calendar' ? 'Calendar' : 'New Task'}
              </h3>
              <button onClick={() => setSidebar(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {sidebar === 'calendar' ? (
                (user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin') ? (
                  <DeptCalendar
                    user={user}
                    state={state}
                    updateState={updateState}
                    deptName={activeDepartment}
                    showPosts={true}
                  />
                ) : (
                  <PersonalCalendar
                    user={user}
                    state={state}
                    updateState={updateState}
                    compact={false}
                  />
                )
              ) : sidebar === 'taskForm' && canAssignTasks ? (
                <form onSubmit={handleAddTask} className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Task Name</label>
                    <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="e.g. Aura Serum Instagram Ad V1" required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm h-16" placeholder="Brief / notes / creative direction..." />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Timeline Milestone</label>
                    <select value={daysPrior} onChange={e => setDaysPrior(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm">
                      <option value="3">3 Days — Review / Renders</option>
                      <option value="4">4 Days — Dailies / Rough Drafts</option>
                      <option value="12">12 Days — Shoot / Storyboard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Assign to</label>
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
                          info?.color === 'amber' ? 'text-amber-400' :
                          ''
                        }>{label}</option>;
                      })}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <DatePicker label="Prior Date" value={scheduledDate} onChange={setScheduledDate} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Attachment Link</label>
                      <input type="url" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
                        className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Drive / Figma URL" />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-neon-gradient py-2.5 rounded-xl text-white font-medium shadow-md transition duration-200 flex items-center justify-center gap-2 hover:opacity-90"
                    onClick={() => setSidebar(null)}>
                    <Plus className="w-5 h-5" /> Queue Asset
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ── Revision modal ── */}
      {revisionTaskId && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setRevisionTaskId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-panel border border-amber-500/20 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
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

import React, { useState, useMemo } from 'react';
import {
  Film, Image, Camera, Plus, AlertCircle, User, Link as LinkIcon,
  GitBranch, X, Filter,
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import { DatePicker } from '../ui';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';

const COLUMNS = ['New', 'In Progress', 'Review', 'Completed'];

const COLUMN_STYLES = {
  'New':         { header: 'text-violet-300',    panelBg: 'bg-violet-950/30',    borderCol: 'border-violet-500/15' },
  'In Progress': { header: 'text-blue-300',      panelBg: 'bg-blue-950/30',      borderCol: 'border-blue-500/15' },
  'Review':      { header: 'text-amber-300',     panelBg: 'bg-amber-950/30',     borderCol: 'border-amber-500/15' },
  'Completed':   { header: 'text-emerald-300',   panelBg: 'bg-emerald-950/30',   borderCol: 'border-emerald-500/15' },
};

const DEPT_DOT = {
  'Paid Ads':               'bg-orange-500',
  'Social Media':           'bg-violet-500',
  'Video Editors':          'bg-red-500',
  'Graphic Designers':      'bg-pink-500',
  'Videography/Photography':'bg-teal-500',
  'Developers':             'bg-blue-500',
  'HR':                     'bg-emerald-500',
};

const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
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

  // ── Timeline filter, modals ─────────────────────────────────────────────
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Revision ────────────────────────────────────────────────────────────
  const [revisionTaskId, setRevisionTaskId] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');

  // ── Drag ────────────────────────────────────────────────────────────────
  const [dragOverCol, setDragOverCol] = useState(null);

  // ── Filter tasks ────────────────────────────────────────────────────────
  const deptTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      const matchesDept = task.department === activeDepartment;
      const matchesTimeline = timelineFilter === 'all'
        ? true
        : String(task.deadlineDaysPrior) === timelineFilter;
      return matchesDept && matchesTimeline;
    });
  }, [tasks, activeDepartment, timelineFilter]);

  const columns = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(c => { grouped[c] = []; });
    deptTasks.forEach(t => {
      const col = COLUMNS.includes(t.status) ? t.status : 'New';
      grouped[col].push(t);
    });
    return grouped;
  }, [deptTasks]);

  const commentCounts = useMemo(() => {
    const counts = {};
    (taskComments || []).forEach(c => { counts[c.taskId] = (counts[c.taskId] || 0) + 1; });
    return counts;
  }, [taskComments]);

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

    if (revisionReason) {
      updates.taskComments = [{
        id: `CMT${Date.now()}`,
        taskId, userId: user.id,
        comment: `Revision note: ${revisionReason}`,
        createdAt: new Date().toISOString(),
      }, ...(taskComments || [])];
    }

    updateState(updates);
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
  const handleDragLeave = () => setDragOverCol(null);
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

  const DeptIcon = activeDepartment === 'Video Editors' ? Film
    : activeDepartment === 'Graphic Designers' ? Image
    : Camera;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Full-width Kanban
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-0">

      {/* ── Row 1: Board identity ── */}
      <div className="flex items-center gap-3 mb-2 flex-shrink-0">
        <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
          <DeptIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100">{activeDepartment}</h1>
          <p className="text-xs text-slate-500">{deptTasks.length} task{deptTasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Row 2: Controls ── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-1 bg-slate-950/50 p-0.5 rounded-lg border border-slate-800/40">
          {[
            { label: 'All', val: 'all' },
            { label: '3D', val: '3' },
            { label: '4D', val: '4' },
            { label: '12D',val: '12' },
          ].map(f => (
            <button key={f.val} onClick={() => setTimelineFilter(f.val)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                timelineFilter === f.val ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition ${
              showFilters ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`} title="Filters & Legend">
            <Filter className="w-4 h-4" />
          </button>

          {showFilters && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-64 glass-panel rounded-xl p-4 shadow-2xl border border-slate-700/60 animate-fade-in">
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
              className="btn-primary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5" title="Add task">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban columns ── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-0 overflow-hidden">
        {COLUMNS.map(col => {
          const colTasks = columns[col] || [];
          const overdue = overdueCount(colTasks);
          const style = COLUMN_STYLES[col];
          const isOver = dragOverCol === col;
          return (
            <div key={col}
              className={`flex flex-col min-h-0 rounded-xl border ${style.borderCol} ${style.panelBg} ${isOver ? 'ring-2 ring-violet-500/50' : ''}`}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${style.header}`}>{col}</h3>
                  <span className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                </div>
                {overdue > 0 && (
                  <span className="text-3xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> {overdue} overdue
                  </span>
                )}
              </div>

              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-16 border border-dashed border-slate-800/60 rounded-lg mt-1">
                    <AlertCircle className="w-4 h-4 text-slate-600 mb-1" />
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
                        <div
                          onClick={() => handleOpenDetail(task)}
                          className={`glass-card p-3 rounded-xl border-l-[3px] transition hover:border-l-violet-400 cursor-pointer ${
                            isOverdue ? 'border-l-rose-500 bg-rose-500/[0.04]' :
                            isDueToday ? 'border-l-amber-500 bg-amber-500/[0.04]' :
                            'border-l-violet-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-100 truncate leading-tight">{task.title}</span>
                            {task.priority && (
                              <span className={`text-3xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                task.priority === 'Emergency' ? 'bg-red-600/15 text-red-400' :
                                task.priority === 'High' ? 'bg-rose-500/15 text-rose-400' :
                                task.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                                'bg-slate-500/15 text-slate-400'
                              }`}>{task.priority}</span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {assignee && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {assignee.name.split(' ')[0]}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className={isOverdue ? 'text-rose-400 font-medium' : isDueToday ? 'text-amber-400 font-medium' : ''}>
                                {task.dueDate}
                              </span>
                            )}
                            {cCount > 0 && <span className="text-violet-400 font-semibold">{cCount}c</span>}
                            {task.revisionCount > 0 && <span className="text-amber-400">R{task.revisionCount}</span>}
                            {task.attachmentUrl && <LinkIcon className="w-3 h-3 text-violet-400" />}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTaskForm(false)}>
          <div className="glass-panel border border-violet-500/20 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">New Task</h3>
              <button onClick={() => setShowTaskForm(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
            {canAssignTasks ? (
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Task Name</label>
                  <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="e.g. Aura Serum Instagram Ad V1" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Description</label>
                  <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm h-20" placeholder="Brief / notes / creative direction..." />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Timeline Milestone</label>
                  <select value={daysPrior} onChange={e => setDaysPrior(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm">
                    <option value="3">3 Days — Review / Renders</option>
                    <option value="4">4 Days — Dailies / Rough Drafts</option>
                    <option value="12">12 Days — Shoot / Storyboard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker label="Prior Date" value={scheduledDate} onChange={setScheduledDate} />
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Attachment Link</label>
                    <input type="url" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
                      className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Drive / Figma URL" />
                  </div>
                </div>
                <button type="submit" onClick={() => setShowTaskForm(false)}
                  className="w-full bg-neon-gradient py-2.5 rounded-xl text-white font-medium shadow-md transition duration-200 flex items-center justify-center gap-2 hover:opacity-90">
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

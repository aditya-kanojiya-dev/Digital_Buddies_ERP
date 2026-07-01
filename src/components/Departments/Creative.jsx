import React, { useState } from 'react';
import { Film, Image, Camera, Plus, Clock, AlertCircle, User } from 'lucide-react';
import { useToast } from '../shared/Toast';

export default function Creative({ user, state, updateState, activeDepartment }) {
  const { tasks, employees } = state;
  const toast = useToast();

  const canAssignTasks = user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin' || user.department === 'Social Media';

  // Filter employees for this specific creative department
  const creativeStaff = employees.filter(emp =>
    emp.department === activeDepartment
  );

  // Form state
  const [taskTitle,  setTaskTitle]  = useState('');
  const [daysPrior,  setDaysPrior]  = useState('3');
  const [assigneeId, setAssigneeId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Timeline filter
  const [timelineFilter, setTimelineFilter] = useState('all');

  // ── Use real tasks table, filtered by department + timeline ──────────────
  const deptTasks = (tasks || []).filter(task => {
    const matchesDept     = task.department === activeDepartment;
    const matchesTimeline = timelineFilter === 'all'
      ? true
      : String(task.deadlineDaysPrior) === timelineFilter;
    return matchesDept && matchesTimeline;
  });

  // ── Add task ─────────────────────────────────────────────────────────────
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !assigneeId) return;

    const assignee = employees.find(e => e.id === assigneeId);

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTask = {
      id:                `CT${Date.now()}`,
      title:             taskTitle.trim(),
      description:       '',
      department:        activeDepartment,
      deadlineDaysPrior: parseInt(daysPrior),
      assignedTo:        assigneeId,
      assigneeName:      assignee?.name || '',
      assignedBy:        user.id,
      priority:          'Medium',
      status:            'Pending',
      dueDate:           null,
      scheduledDate:     scheduledDate || null,
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
    setTaskTitle('');
    setAssigneeId('');
    setScheduledDate('');
  };

  // ── Update status ─────────────────────────────────────────────────────────
  const handleUpdateStatus = (taskId, nextStatus) => {
    const t = (tasks || []).find(x => x.id === taskId);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = (tasks || []).map(x =>
      x.id === taskId ? { ...x, status: nextStatus } : x
    );
    const statusNotifs = [];
    if (t?.assignedBy && t.assignedBy !== user.id) {
      statusNotifs.push({
        id:        `NTF${Date.now()}`,
        userId:    t.assignedBy,
        message:   `${user.name} moved "${t.title}" from "${t.status}" to "${nextStatus}".`,
        type:      'info',
        timestamp: now,
        read:      false,
      });
    }
    updateState({
      tasks: updated,
      ...(statusNotifs.length ? { notifications: [...statusNotifs, ...(state.notifications || [])] } : {}),
    });
    toast.success(`Task marked as ${nextStatus}.`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'In Progress':return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Review':     return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:           return 'bg-slate-500/10 text-slate-400 border border-slate-700';
    }
  };

  const DeptIcon = activeDepartment === 'Video Editors' ? Film
    : activeDepartment === 'Graphic Designers' ? Image
    : Camera;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
            <DeptIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{activeDepartment}</h2>
            <p className="text-sm text-slate-400">
              {deptTasks.length} task{deptTasks.length !== 1 ? 's' : ''} in queue
            </p>
          </div>
        </div>

        {/* Timeline filters */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          {[
            { label: 'All',          val: 'all' },
            { label: '3 Days Prior', val: '3'   },
            { label: '4 Days Prior', val: '4'   },
            { label: '12 Days Prior',val: '12'  },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => setTimelineFilter(f.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                timelineFilter === f.val
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Task board */}
        <div className={`glass-panel p-6 rounded-2xl ${canAssignTasks ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <h3 className="text-lg font-semibold text-slate-200">Production Backlog</h3>

          {deptTasks.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">
                No tasks yet for {activeDepartment}
                {timelineFilter !== 'all' ? ` · ${timelineFilter}-day filter` : ''}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deptTasks.map(task => {
                const assignee = employees.find(e => e.id === (task.assignedTo || task.assignee));
                return (
                  <div key={task.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>
                        {task.deadlineDaysPrior && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {task.deadlineDaysPrior}d prior
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-100 text-sm">{task.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {assignee ? assignee.name : task.assigneeName || 'Unassigned'}
                      </p>
                      {task.scheduledDate && (
                        <p className="text-3xs text-slate-500">Prior Date: {task.scheduledDate}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/40">
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                        className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'Review')}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'Completed')}
                        className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task creator */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-200">Log Creative Asset</h3>

          {canAssignTasks ? (
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Asset / Task Name</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="e.g. Aura Serum Instagram Ad V1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Timeline Milestone</label>
                <select
                  value={daysPrior}
                  onChange={(e) => setDaysPrior(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                >
                  <option value="3">3 Days Prior — Review / Renders</option>
                  <option value="4">4 Days Prior — Dailies / Rough Drafts</option>
                  <option value="12">12 Days Prior — Shoot / Storyboard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Assign to</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  required
                >
                  <option value="">— Choose member —</option>
                  {creativeStaff.length === 0 && (
                    <option disabled>No {activeDepartment} staff found</option>
                  )}
                  {creativeStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Prior Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-neon-gradient py-3 rounded-xl text-white font-medium shadow-md transition duration-200 flex items-center justify-center gap-2 hover:opacity-90"
              >
                <Plus className="w-5 h-5" /> Queue Asset
              </button>
            </form>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Task assignment is restricted to Managers, Admins, and Social Media department</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
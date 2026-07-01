import React, { useState } from 'react';
import { Plus, Bell, BellOff, RefreshCw, Clock, User, AlertCircle } from 'lucide-react';
import { useToast } from './shared/Toast';
import { checkPingCooldown, formatCooldown } from '../lib/deadlineEngine';
import TaskCard from './shared/TaskCard';
import TaskDetailPanel from './shared/TaskDetailPanel';
import DepartmentKpiStrip from './shared/DepartmentKpiStrip';

// ── Date helpers (kept here because they're used by handlers, not just the badge) ──
const todayStr = () => new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerDashboard({ user, state, updateState, onNotifFocus, setActiveTab }) {
  const toast = useToast();
  const { employees, tasks, timelogs, projects, notifications } = state;

  const isSuperAdmin = user.role === 'Super Admin';
  const managerDept  = user.department;

  const deptStaff = employees.filter(emp  => isSuperAdmin ? true : emp.department  === managerDept);
  const deptTasks = tasks.filter(task => isSuperAdmin ? true : task.department === managerDept);

  // ── Task creation form ────────────────────────────────────────────────────
  const [taskTitle,    setTaskTitle]    = useState('');
  const [taskDesc,     setTaskDesc]     = useState('');
  const [assigneeId,   setAssigneeId]   = useState('');
  const [taskProject,  setTaskProject]  = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDue,      setTaskDue]      = useState('');
  const [taskScheduledDate, setTaskScheduledDate] = useState('');

  const canAssignTasks = user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'Admin' || user.department === 'Social Media';
  const CREATIVE_DEPTS = ['Developers', 'Video Editors', 'Graphic Designers', 'Videography/Photography'];
  const selectedAssignee = employees.find(emp => emp.id === assigneeId);
  const isCreativeDept = selectedAssignee && CREATIVE_DEPTS.includes(selectedAssignee.department);

  // ── Reassignment ──────────────────────────────────────────────────────────
  const [reassignTaskId, setReassignTaskId] = useState('');
  const [reassignEmpId,  setReassignEmpId]  = useState('');

  // ── Ping state ────────────────────────────────────────────────────────────
  const [activePingTaskId, setActivePingTaskId] = useState('');
  const [pingMessages,     setPingMessages]     = useState({});

  // ── TaskDetailPanel state ─────────────────────────────────────────────────
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle || !assigneeId) return;

    const staffMember = employees.find(emp => emp.id === assigneeId);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newTask = {
      id:            `TSK${Date.now()}`,
      title:         taskTitle,
      description:   taskDesc,
      assignedTo:    assigneeId,
      assignedBy:    user.id,
      department:    staffMember?.department || managerDept,
      projectId:     taskProject || 'General',
      priority:      taskPriority,
      status:        'New',
      dueDate:       taskDue || new Date(Date.now() + 5 * 86_400_000).toISOString().split('T')[0],
      createdAt:     new Date().toISOString().split('T')[0],
      pinged:        0,
      lastPingedAt:  null,
      scheduledDate: isCreativeDept ? taskScheduledDate || null : null,
    };

    updateState({ tasks: [...tasks, newTask] });
    updateState({ notifications: [{
      id:        `NTF${Date.now()}`,
      userId:    assigneeId,
      message:   `${user.name} assigned task "${taskTitle}" to you.`,
      type:      'assignment',
      timestamp: now,
      read:      false,
    }, ...notifications] });
    updateState({ auditLogs: [{
      id:        `AUD${Date.now()}`,
      userId:    user.id,
      action:    'Task Created',
      details:   `${user.name} assigned task "${taskTitle}" to ${staffMember?.name}.`,
      timestamp: now,
    }, ...state.auditLogs] });

    toast.success(`Task assigned to ${staffMember?.name}.`, `"${taskTitle}"`);
    setTaskTitle(''); setTaskDesc(''); setAssigneeId(''); setTaskDue(''); setTaskScheduledDate('');
  };

  const handleReassignSubmit = (e, taskId) => {
    e.preventDefault();
    if (!reassignEmpId) return;
    const staffMember = employees.find(emp => emp.id === reassignEmpId);
    const origTitle   = tasks.find(t => t.id === taskId)?.title;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    updateState({ tasks: tasks.map(t =>
      t.id === taskId ? { ...t, assignedTo: reassignEmpId, department: staffMember?.department || t.department } : t
    )});
    updateState({ notifications: [{
      id:        `NTF${Date.now()}`,
      userId:    reassignEmpId,
      message:   `${user.name} reassigned task "${origTitle}" to you.`,
      type:      'assignment',
      timestamp: now,
      read:      false,
    }, ...notifications] });

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
      id:        `NTF${Date.now()}`,
      userId:    task.assignedTo,
      message,
      type:      'ping',
      timestamp: nowDisplay,
      read:      false,
    }, ...notifications] });
    updateState({ auditLogs: [{
      id:        `AUD${Date.now()}`,
      userId:    user.id,
      action:    'Task Ping Sent',
      details:   `${user.name} pinged "${task.title}"${customMsg ? ` with message: "${customMsg}"` : ''}.`,
      timestamp: nowDisplay,
    }, ...state.auditLogs] });

    toast.success('Ping dispatched to assignee.', `"${task.title}"`);

    setActivePingTaskId('');
    setPingMessages(prev => { const n = { ...prev }; delete n[task.id]; return n; });
  };

  // ── Helper: pre-compute comment counts per task ─────────────────────────
  const commentCounts = (state.taskComments || []).reduce((acc, c) => {
    acc[c.taskId] = (acc[c.taskId] || 0) + 1;
    return acc;
  }, {});

  // ── renderActions: ping + reassign compose boxes, passed to TaskCard ───
  const renderPingReassign = (task) => {
    const assignee       = employees.find(e => e.id === task.assignedTo);
    const isReassigning  = reassignTaskId === task.id;
    const isPingOpen     = activePingTaskId === task.id;
    const cooldown       = formatCooldown(task);
    const isCompleted    = task.status === 'Completed';

    // Top row: action buttons (rendered above the compose boxes)
    if (!isReassigning && !isPingOpen) {
      return (
        <div className="flex flex-wrap gap-2 justify-end border-t border-slate-800/40 pt-2.5">
          <button
            onClick={() => { setReassignTaskId(task.id); setActivePingTaskId(''); }}
            className="bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-2xs text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-fuchsia-400" /> Reassign
          </button>
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
              {deptStaff.filter(e => e.id !== task.assignedTo).map(emp => (
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
                <label className="block text-xs text-slate-400 mb-1">Description / Brief</label>
                <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm h-16" placeholder="Details of deliverables..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assignee</label>
                  <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" required>
                    <option value="">-- Select --</option>
                    {deptStaff.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs">
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" required />
                </div>
              </div>
              {isCreativeDept && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Prior Date</label>
                  <input type="date" value={taskScheduledDate} onChange={e => setTaskScheduledDate(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs" />
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
        <div className={`glass-panel p-6 rounded-2xl ${canAssignTasks ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <h3 className="text-lg font-bold text-slate-100">
            Team Tasks {!isSuperAdmin && `— ${managerDept}`}
          </h3>

          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {deptTasks.length === 0 ? (
              <p className="text-slate-400 text-center py-12 text-sm">No tasks in queue.</p>
            ) : (
              deptTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={employees.find(e => e.id === task.assignedTo)}
                  commentsCount={commentCounts[task.id] || 0}
                  viewMode="manager"
                  onOpenDetail={(t) => setSelectedTaskId(t.id)}
                  renderActions={renderPingReassign}
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
              const empTasks  = tasks.filter(t => t.assignedTo === emp.id);
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
    </div>
  );
}
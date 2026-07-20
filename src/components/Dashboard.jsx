import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, Clock, Calendar, CheckSquare, Plus, Bell, LogIn, LogOut, Coffee, AlertCircle, Eye } from 'lucide-react';
import { useToast } from './shared/Toast';
import PersonalCalendar from './shared/PersonalCalendar';
import { today, genId } from '../lib/format';

export default function Dashboard({ user, state, updateState, onNavigate }) {
  const toast = useToast();
  const { tasks, timelogs, attendance, notifications } = state;

  const myTasks = tasks.filter(t => t.assignedTo === user.id || t.assignedTo2 === user.id);
  const myLogs = timelogs.filter(l => l.employeeId === user.id);
  const myAttendance = attendance.filter(a => a.employeeId === user.id);
  const myNotifications = notifications.filter(n => n.userId === user.id);

  const todayStr = today();
  const todayAttendance = myAttendance.find(a => (a.logDate || a.date) === todayStr);

  const parseBreaks = (att) => {
    if (!att?.breaks) return [];
    if (Array.isArray(att.breaks)) return att.breaks;
    try { return JSON.parse(att.breaks); } catch { return []; }
  };

  const resolvedBreaks = parseBreaks(todayAttendance);

  const [attType, setAttType] = useState('Office');
  const [attLoading, setAttLoading] = useState(false);

  const handleClockIn = async () => {
    if (attLoading) return;
    setAttLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const newAtt = {
        id: genId('ATT'),
        employeeId: user.id,
        logDate: todayStr,
        clockIn: timeStr,
        clockOut: null,
        breaks: '[]',
        status: "Present",
        type: attType
      };
      updateState({ attendance: [...attendance, newAtt] });
      const newAudit = {
        id: genId('AUD'),
        userId: user.id,
        action: "Clock In",
        details: `${user.name} clocked in at ${timeStr} (${attType}).`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      updateState({ auditLogs: [newAudit, ...state.auditLogs] });
      toast.success(`Clocked in at ${timeStr}`);
    } finally {
      setAttLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance || attLoading) return;
    setAttLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const updated = attendance.map(a => {
        if (a.id === todayAttendance.id) return { ...a, clockOut: timeStr };
        return a;
      });
      updateState({ attendance: updated });
      const newAudit = {
        id: genId('AUD'),
        userId: user.id,
        action: "Clock Out",
        details: `${user.name} clocked out at ${timeStr}.`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      updateState({ auditLogs: [newAudit, ...state.auditLogs] });
      toast.success(`Clocked out at ${timeStr}`);
    } finally {
      setAttLoading(false);
    }
  };

  const onBreak = resolvedBreaks.some(
    (b) => typeof b === 'object' && b.end === null
  );

  const handleToggleBreak = () => {
    if (!todayAttendance) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const breaks = resolvedBreaks;

    let updatedBreaks;
    if (!onBreak) {
      updatedBreaks = [...breaks, { start: timeStr, end: null, minutes: null }];
      toast.info(`Break started at ${timeStr}.`);
    } else {
      updatedBreaks = breaks.map((b) => {
        if (typeof b !== 'object' || b.end !== null) return b;
        const [sh, sm] = b.start.split(':').map(Number);
        const [eh, em] = timeStr.split(':').map(Number);
        const minutes = Math.max((eh * 60 + em) - (sh * 60 + sm), 1);
        return { ...b, end: timeStr, minutes };
      });
      const lastBreak = updatedBreaks.findLast(
        (b) => typeof b === 'object' && b.end !== null
      );
      toast.success(`Break ended at ${timeStr}. ${lastBreak?.minutes ?? 0} min logged.`);
    }

    const updated = attendance.map((a) =>
      a.id === todayAttendance.id ? { ...a, breaks: JSON.stringify(updatedBreaks) } : a
    );
    updateState({ attendance: updated });
    const newAudit = {
      id: genId('AUD'),
      userId: user.id,
      action: onBreak ? 'Break End' : 'Break Start',
      details: `${user.name} ${onBreak ? 'ended' : 'started'} a break at ${timeStr}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    updateState({ auditLogs: [newAudit, ...state.auditLogs] });
  };

  const [timerTaskId, setTimerTaskId] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef(null);
  const [logDesc, setLogDesc] = useState('');

  const [manualTaskId, setManualTaskId] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  useEffect(() => {
    if (timerRunning) {
      const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
      timerIntervalRef.current = id;
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  const handleStartTimer = () => {
    if (!timerTaskId) {
      toast.warning('Select a task before starting the timer.');
      return;
    }
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const handleStopTimer = () => {
    setTimerRunning(false);
    const hrs = parseFloat((timerSeconds / 3600).toFixed(2));
    const finalHrs = hrs > 0 ? hrs : 0.1;
    const task = tasks.find(t => t.id === timerTaskId);
    const newLog = {
      id: genId('TL'),
      employeeId: user.id,
      taskId: timerTaskId,
      date: todayStr,
      hours: finalHrs,
      description: logDesc || `Worked on ${task?.title || 'task'}.`,
      startTime: null,
      timerRunning: false
    };
    updateState({ timelogs: [...timelogs, newLog] });
    toast.success(`${finalHrs} hrs logged against "${task?.title}"`);
    setTimerSeconds(0);
    setLogDesc('');
  };

  const handleManualLog = (e) => {
    e.preventDefault();
    if (!manualTaskId || !manualHours) return;
    const task = tasks.find(t => t.id === manualTaskId);
    const newLog = {
      id: genId('TL'),
      employeeId: user.id,
      taskId: manualTaskId,
      date: todayStr,
      hours: parseFloat(manualHours),
      description: manualDesc || `Manually logged progress on ${task?.title}.`,
      startTime: null,
      timerRunning: false
    };
    updateState({ timelogs: [...timelogs, newLog] });
    toast.success('Time entry saved.');
    setManualHours('');
    setManualDesc('');
  };

  const todayStr2 = todayStr;
  const todoTasks = useMemo(() => {
    const active = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Blocked');
    return [...active].sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < todayStr2 ? 1 : 0;
      const bOverdue = b.dueDate && b.dueDate < todayStr2 ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      const aToday = a.dueDate === todayStr2 ? 1 : 0;
      const bToday = b.dueDate === todayStr2 ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [myTasks, todayStr2]);

  const empName = (id) => state.employees?.find(e => e.id === id)?.name || 'Unknown';

  const handleUpdateStatus = (taskId, newStatus) => {
    const found = tasks.find(x => x.id === taskId);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = tasks.map(task => {
      if (task.id === taskId) return { ...task, status: newStatus };
      return task;
    });
    const notifUpdates = {};
    if (found?.assignedBy && found.assignedBy !== user.id) {
      notifUpdates.notifications = [{
        id: genId('NTF'),
        userId: found.assignedBy,
        message: `${user.name} moved "${found.title}" from "${found.status}" to "${newStatus}".`,
        type: 'info',
        timestamp: now,
        read: false,
      }, ...state.notifications];
    }
    updateState({
      tasks: updated,
      auditLogs: [{
        id: genId('AUD'),
        userId: user.id,
        action: 'Task Updated',
        details: `${user.name} changed task status to '${newStatus}'.`,
        timestamp: now,
      }, ...state.auditLogs],
      ...notifUpdates,
    });
  };

  const handleAcknowledge = (taskId, mode) => {
    const found = tasks.find(x => x.id === taskId);
    if (!found) return;
    const now = new Date().toISOString();
    const displayTime = now.replace('T', ' ').substring(0, 16);
    const updated = tasks.map(task => {
      if (task.id === taskId) return { ...task, acknowledgedAt: now, status: mode === 'working' ? 'In Progress' : task.status };
      return task;
    });
    const msg = mode === 'working'
      ? `${user.name} is working on "${found.title}"`
      : `${user.name} has seen "${found.title}"`;
    const notifUpdates = {};
    if (found.assignedBy && found.assignedBy !== user.id) {
      notifUpdates.notifications = [{
        id: genId('NTF'),
        userId: found.assignedBy,
        message: msg,
        type: 'info',
        timestamp: displayTime,
        read: false,
      }, ...state.notifications];
    }
    updateState({ tasks: updated, ...notifUpdates });
    toast.success(mode === 'working' ? 'Marked as In Progress' : 'Acknowledged');
  };

  const calendarReady = useMemo(() => {
    const map = {};
    (state.smmCalendar || []).forEach(entry => {
      if (entry.status !== 'Scheduled') return;
      const linked = (state.tasks || []).filter(t => t.calendar_id === entry.id);
      if (linked.length === 0) return;
      const allDone = linked.every(t => t.status === 'Completed');
      if (allDone) map[entry.id] = true;
    });
    return map;
  }, [state.smmCalendar, state.tasks]);

  const handleMarkAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    updateState({ notifications: updated });
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="space-y-5 sm:space-y-8 animate-fade-in">

      {myNotifications.filter(n => !n.read).length > 0 && (
        <div className="space-y-3">
          {myNotifications.filter(n => !n.read).map(notif => (
            <div key={notif.id} className="bg-violet-500/10 border border-violet-500/20 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse-soft">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 min-w-0">
                <Bell className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <span className="truncate">{notif.message}</span>
              </div>
              <button
                onClick={() => handleMarkAsRead(notif.id)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-[0.65rem] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" /> Attendance
          </h3>

          {!todayAttendance ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Not clocked in for today.</p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Work Location</label>
                <select
                  value={attType}
                  onChange={(e) => setAttType(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                >
                  <option value="Office">Office</option>
                  <option value="WFH">Work From Home</option>
                </select>
              </div>
              <button
                onClick={handleClockIn}
                disabled={attLoading}
                className="w-full bg-neon-gradient hover:opacity-95 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow transition-opacity"
              >
                <LogIn className="w-4 h-4" /> Clock In
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[var(--surface-input)] p-4 rounded-xl space-y-2 border border-[var(--border-soft)]">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{todayAttendance.type}</span>
                  <span className="text-emerald-400 font-bold font-mono">Present</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>In: <span className="font-mono text-slate-200 font-bold">{todayAttendance.clockIn}</span></span>
                  <span>Out: <span className="font-mono text-slate-500">{todayAttendance.clockOut || '--:--'}</span></span>
                </div>
                <div className="text-3xs text-slate-500 border-t border-slate-900 pt-2 flex items-center justify-between">
                  <span>
                    Breaks:
                    {onBreak && <span className="ml-1.5 text-amber-400 font-bold animate-pulse-soft">● On break</span>}
                  </span>
                  <span>{resolvedBreaks.reduce((sum, b) => {
                    if (typeof b === 'number') return sum + b;
                    return b.minutes ? sum + b.minutes : sum;
                  }, 0)} min</span>
                </div>
              </div>

              {!todayAttendance.clockOut ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleToggleBreak}
                    className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-all duration-200 ${
                      onBreak
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    {onBreak ? 'End Break' : 'Break'}
                  </button>
                  <button
                    onClick={handleClockOut}
                    disabled={attLoading}
                    className="bg-rose-600/80 hover:bg-rose-600 disabled:opacity-60 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Clock Out
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center font-bold">Duty finished for today.</p>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5 lg:col-span-2 relative overflow-hidden">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-fuchsia-400" /> Time Tracker
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Task</label>
                <select
                  value={timerTaskId}
                  onChange={(e) => setTimerTaskId(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  disabled={timerRunning}
                >
                  <option value="">-- Choose Task --</option>
                  {myTasks.filter(t => t.status !== 'Completed').map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              {timerRunning && (
                <div className="animate-fade-in">
                  <label className="block text-xs text-slate-400 mb-1">Note</label>
                  <input
                    type="text"
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                    placeholder="Describe progress..."
                  />
                </div>
              )}

              <div className="flex gap-3">
                {!timerRunning ? (
                  <button
                    onClick={handleStartTimer}
                    className="flex-1 bg-neon-gradient hover:opacity-95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-opacity"
                  >
                    <Play className="w-4 h-4" /> Start
                  </button>
                ) : (
                  <button
                    onClick={handleStopTimer}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Square className="w-4 h-4" /> Stop & Log
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-[var(--surface-input)] border border-[var(--border-soft)] p-5 sm:p-6 rounded-2xl">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-glow text-violet-400">
                {formatTime(timerSeconds)}
              </span>
              <span className="text-3xs uppercase tracking-widest text-slate-500 font-mono mt-1">
                {timerRunning ? 'Timer active' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 lg:col-span-3">
          {(() => {
            const weekStart = todayStr;
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekEndStr = weekEnd.toISOString().split('T')[0];
            const monthStart = todayStr.substring(0, 7);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const widgets = [
              {
                label: "Today's Tasks",
                val: myTasks.filter(t => t.dueDate === todayStr && t.status !== 'Completed').length,
                color: 'text-violet-400', bg: 'bg-violet-500/10',
                icon: Clock,
              },
              {
                label: 'Due This Week',
                val: myTasks.filter(t => t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEndStr && t.status !== 'Completed').length,
                color: 'text-indigo-400', bg: 'bg-indigo-500/10',
                icon: Calendar,
              },
              {
                label: 'Overdue',
                val: myTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Completed').length,
                color: 'text-rose-400', bg: 'bg-rose-500/10',
                icon: AlertCircle,
              },
              {
                label: 'Completed',
                val: myTasks.filter(t => t.status === 'Completed' && t.createdAt?.startsWith(monthStart)).length,
                color: 'text-emerald-400', bg: 'bg-emerald-500/10',
                icon: CheckSquare,
              },
              {
                label: 'New',
                val: myTasks.filter(t => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo).length,
                color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10',
                icon: Plus,
              },
              {
                label: 'Next Deadline',
                val: (() => {
                  const upcoming = myTasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.status !== 'Completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                  return upcoming.length > 0 ? upcoming[0].dueDate : '—';
                })(),
                color: 'text-amber-400', bg: 'bg-amber-500/10',
                icon: Bell,
              },
            ];
            return widgets.map((w, i) => (
              <div key={w.label} className={`glass-card p-3 rounded-xl flex items-center gap-3 animate-fade-in stagger-${Math.min(i + 1, 10)}`}>
                <div className={`p-2 rounded-lg ${w.bg}`}>
                  <w.icon className={`w-4 h-4 ${w.color}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-base sm:text-lg font-extrabold ${w.color} truncate tabular-nums`}>{w.val}</div>
                  <div className="text-[0.65rem] text-slate-400 truncate">{w.label}</div>
                </div>
              </div>
            ));
          })()}
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 lg:col-span-3 relative overflow-hidden">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-400" /> My Calendar
          </h3>
          <PersonalCalendar
            user={user}
            state={state}
            updateState={updateState}
            compact
            onExpand={() => onNavigate && onNavigate('my-calendar')}
          />
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-400" /> My To-Do List
          </h3>
          <span className="text-xs text-slate-400">{todoTasks.length} active</span>
        </div>

        {todoTasks.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">No active tasks. You're all caught up.</p>
        ) : (
          <div className="space-y-2">
            {todoTasks.map((t, i) => {
              const isOverdue = t.dueDate && t.dueDate < todayStr;
              const isDueToday = t.dueDate === todayStr;
              return (
                <div key={t.id}
                  className={`glass-card p-3 sm:p-4 rounded-xl border-l-4 transition-all duration-200 animate-fade-in stagger-${Math.min(i + 1, 8)} ${
                    isOverdue ? 'border-l-rose-500 bg-rose-500/5' :
                    isDueToday ? 'border-l-amber-500 bg-amber-500/5' :
                    t.status === 'In Progress' ? 'border-l-blue-500' :
                    t.status === 'Review' ? 'border-l-fuchsia-500' :
                    'border-l-violet-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-3xs px-1.5 py-0.5 rounded font-bold font-mono ${
                          t.priority === 'Emergency' ? 'bg-red-600/20 text-red-400' :
                          t.priority === 'High' ? 'bg-rose-500/15 text-rose-400' :
                          t.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>{t.priority}</span>
                        <span className={`text-3xs px-1.5 py-0.5 rounded font-bold ${
                          t.status === 'New' ? 'bg-slate-500/15 text-slate-400' :
                          t.status === 'In Progress' ? 'bg-blue-500/15 text-blue-400' :
                          t.status === 'Review' ? 'bg-fuchsia-500/15 text-fuchsia-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        }`}>{t.status}</span>
                        {t.department && <span className="text-3xs text-slate-500">{t.department}</span>}
                        {isOverdue && <span className="text-3xs text-rose-400 font-bold">OVERDUE</span>}
                        {isDueToday && <span className="text-3xs text-amber-400 font-bold">DUE TODAY</span>}
                      </div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-200">{t.title}</h5>
                      <div className="flex items-center gap-3 text-3xs text-slate-500 flex-wrap">
                        <span className="font-mono text-violet-400 font-semibold">{t.id}</span>
                        <span>Due: {t.dueDate || '—'}</span>
                        {t.assignedBy && <span>From: {empName(t.assignedBy)}</span>}
                        {t.acknowledgedAt && <span className="text-emerald-400">✓ Seen</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {t.status === 'New' && !t.acknowledgedAt && (
                        <button onClick={() => handleAcknowledge(t.id, 'seen')}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer" title="Mark as seen">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.status === 'New' && (
                        <button onClick={() => handleAcknowledge(t.id, 'working')}
                          className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-3xs font-bold px-2.5 py-1.5 rounded-lg border border-violet-500/25 transition-colors cursor-pointer whitespace-nowrap">
                          Start Work
                        </button>
                      )}
                      {t.status === 'In Progress' && (
                        <button onClick={() => handleUpdateStatus(t.id, 'Review')}
                          className="bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-400 text-3xs font-bold px-2.5 py-1.5 rounded-lg border border-fuchsia-500/25 transition-colors cursor-pointer whitespace-nowrap">
                          Review
                        </button>
                      )}
                      {t.status === 'Review' && (
                        <button onClick={() => handleUpdateStatus(t.id, 'Completed')}
                          className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-3xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap">
                          Complete
                        </button>
                      )}
                      {t.status === 'New' && (
                        <button onClick={() => handleUpdateStatus(t.id, 'Blocked')}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Blocked">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {Object.keys(calendarReady).length > 0 && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3 border border-emerald-500/20 animate-fade-in">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Ready to Publish
          </h3>
          <p className="text-xs text-slate-400">All linked tasks completed.</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(calendarReady).map(entryId => {
              const entry = (state.smmCalendar || []).find(e => e.id === entryId);
              if (!entry) return null;
              return (
                <span key={entryId} className="bg-emerald-500/10 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-medium">
                  {entry.title}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 sm:space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-400" /> Manual Timelog
          </h3>
          <form onSubmit={handleManualLog} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Task</label>
              <select
                value={manualTaskId}
                onChange={(e) => setManualTaskId(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm min-h-[44px]"
                required
              >
                <option value="">-- Choose Task --</option>
                {myTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hours</label>
              <input
                type="number"
                step="0.5"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm min-h-[44px]"
                placeholder="2.5"
                min="0.5"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm min-h-[80px]"
                placeholder="Describe the work done..."
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[var(--accent-strong)] hover:bg-[var(--accent)] py-3 rounded-xl text-sm text-white font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              Submit Timelog
            </button>
          </form>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-100">My Timesheet</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {myLogs.length === 0 ? (
              <p className="text-slate-400 text-center py-10 text-xs">No logged hours yet.</p>
            ) : (
              myLogs.map(log => {
                const task = tasks.find(t => t.id === log.taskId);
                return (
                  <div key={log.id} className="glass-card p-3 sm:p-4 rounded-xl flex items-start justify-between gap-4 border-l-2 border-l-fuchsia-500">
                    <div className="space-y-1 min-w-0">
                      <h5 className="font-bold text-xs text-slate-200 truncate">{task ? task.title : 'General Work'}</h5>
                      <p className="text-2xs text-slate-400 line-clamp-1 italic truncate">"{log.description}"</p>
                      <p className="text-3xs text-slate-500">{log.date}</p>
                    </div>
                    <span className="bg-fuchsia-500/10 text-fuchsia-400 text-xs px-2.5 py-1 rounded-xl font-bold font-mono flex-shrink-0">
                      {log.hours}h
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

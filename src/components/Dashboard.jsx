import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, Calendar, CheckSquare, Plus, Bell, Eye, LogIn, LogOut, Coffee } from 'lucide-react';
import { useToast } from './shared/Toast';

export default function Dashboard({ user, state, updateState }) {
  const toast = useToast();
  const { tasks, timelogs, attendance, notifications, employees } = state;

  // Filter only personal assets
  const myTasks = tasks.filter(t => t.assignedTo === user.id);
  const myLogs = timelogs.filter(l => l.employeeId === user.id);
  const myAttendance = attendance.filter(a => a.employeeId === user.id);
  const myNotifications = notifications.filter(n => n.userId === user.id);

  // Today's Date
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = myAttendance.find(a => a.date === todayStr);

  // -------------------------
  // ATTENDANCE ACTIONS
  // -------------------------
  const [attType, setAttType] = useState('Office');
  
  const handleClockIn = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    
    const newAtt = {
      id: `ATT${Date.now()}`,
      employeeId: user.id,
      date: todayStr,
      clockIn: timeStr,
      clockOut: null,
      breaks: [],
      status: "Present",
      type: attType
    };

    updateState({ attendance: [...attendance, newAtt] });
    
    // Log Audit Log
    const newAudit = {
      id: `AUD${Date.now()}`,
      userId: user.id,
      action: "Clock In",
      details: `${user.name} clocked in at ${timeStr} (${attType}).`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    updateState({ auditLogs: [newAudit, ...state.auditLogs] });

    toast.success(`Clocked in at ${timeStr}`);
  };

  const handleClockOut = () => {
    if (!todayAttendance) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const updated = attendance.map(a => {
      if (a.id === todayAttendance.id) {
        return { ...a, clockOut: timeStr };
      }
      return a;
    });

    updateState({ attendance: updated });

    const newAudit = {
      id: `AUD${Date.now()}`,
      userId: user.id,
      action: "Clock Out",
      details: `${user.name} clocked out at ${timeStr}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    updateState({ auditLogs: [newAudit, ...state.auditLogs] });

    toast.success(`Clocked out at ${timeStr}`);
  };

  // Derived: is there an open (un-ended) break right now?
  const onBreak = (todayAttendance?.breaks || []).some(
    (b) => typeof b === 'object' && b.end === null
  );

  const handleToggleBreak = () => {
    if (!todayAttendance) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    const breaks = todayAttendance.breaks || [];

    let updatedBreaks;
    if (!onBreak) {
      // ── Start break: append an open break object ──────────────────────────
      updatedBreaks = [...breaks, { start: timeStr, end: null, minutes: null }];
      toast.info(`Break started at ${timeStr}.`);
    } else {
      // ── End break: close the open entry and calculate real minutes ─────────
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
      a.id === todayAttendance.id ? { ...a, breaks: updatedBreaks } : a
    );
    updateState({ attendance: updated });

    // Audit log
    const newAudit = {
      id: `AUD${Date.now()}`,
      userId: user.id,
      action: onBreak ? 'Break End' : 'Break Start',
      details: `${user.name} ${onBreak ? 'ended' : 'started'} a break at ${timeStr}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    updateState({ auditLogs: [newAudit, ...state.auditLogs] });
  };

  // -------------------------
  // TASK STOPWATCH TIMER STATE
  // -------------------------
  const [timerTaskId, setTimerTaskId] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [logDesc, setLogDesc] = useState('');

  // Manual Log form
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  useEffect(() => {
    if (timerRunning) {
      const id = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
      setTimerIntervalId(id);
    } else {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
    }
    return () => {
      if (timerIntervalId) clearInterval(timerIntervalId);
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
    
    // Minimum 1 min logging mock
    const finalHrs = hrs > 0 ? hrs : 0.1; 

    const task = tasks.find(t => t.id === timerTaskId);
    const newLog = {
      id: `TL${Date.now()}`,
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
    
    // Reset timer states
    setTimerSeconds(0);
    setLogDesc('');
  };

  const handleManualLog = (e) => {
    e.preventDefault();
    if (!manualTaskId || !manualHours) return;

    const task = tasks.find(t => t.id === manualTaskId);
    const newLog = {
      id: `TL${Date.now()}`,
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

  // -------------------------
  // TASK UPDATE
  // -------------------------
  const handleUpdateStatus = (taskId, status) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status };
      }
      return t;
    });
    updateState({ tasks: updated });
    
    // Log Audit Log
    const newAudit = {
      id: `AUD${Date.now()}`,
      userId: user.id,
      action: "Task Updated",
      details: `${user.name} changed task status to '${status}'.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    updateState({ auditLogs: [newAudit, ...state.auditLogs] });
  };

  // -------------------------
  // NOTIFICATION ACTIONS
  // -------------------------
  const handleMarkAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    updateState({ notifications: updated });
  };

  // Formatting seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Administrative Pings notifications alert drawer */}
      {myNotifications.filter(n => !n.read).length > 0 && (
        <div className="space-y-3">
          {myNotifications.filter(n => !n.read).map(notif => (
            <div key={notif.id} className="bg-violet-650/15 border border-violet-500/25 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <Bell className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <span>{notif.message}</span>
              </div>
              <button
                onClick={() => handleMarkAsRead(notif.id)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-3xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Overview Cards & Clock in actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Attendance card clock-in/out */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" /> Attendance Registry
          </h3>

          {!todayAttendance ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">You are not clocked in for today ({todayStr}).</p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Work Location Type</label>
                <select
                  value={attType}
                  onChange={(e) => setAttType(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                >
                  <option value="Office">Office Attendance</option>
                  <option value="WFH">Work From Home (WFH)</option>
                </select>
              </div>
              <button
                onClick={handleClockIn}
                className="w-full bg-neon-gradient hover:opacity-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <LogIn className="w-4 h-4" /> Clock In Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-900">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Duty Mode: <span className="text-slate-200 font-semibold">{todayAttendance.type}</span></span>
                  <span className="text-emerald-400 font-bold font-mono">Present</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Clocked In: <span className="font-mono text-slate-200 font-bold">{todayAttendance.clockIn}</span></span>
                  <span>Clocked Out: <span className="font-mono text-slate-350">{todayAttendance.clockOut || '--:--'}</span></span>
                </div>
                <div className="text-3xs text-slate-500 border-t border-slate-900 pt-2 flex items-center justify-between">
                  <span>
                    Cumulative break periods:
                    {onBreak && (
                      <span className="ml-1.5 text-amber-400 font-bold animate-pulse">● On break</span>
                    )}
                  </span>
                  <span>
                    {(todayAttendance.breaks || []).reduce((sum, b) => {
                      // legacy format: plain integer minutes
                      if (typeof b === 'number') return sum + b;
                      // new format: only count completed breaks
                      return b.minutes ? sum + b.minutes : sum;
                    }, 0)} min logged
                  </span>
                </div>
              </div>

              {!todayAttendance.clockOut ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleToggleBreak}
                    className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition ${
                      onBreak
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-750'
                    }`}
                  >
                    <Coffee className="w-4 h-4 text-amber-400" />
                    {onBreak ? 'End Break' : 'Start Break'}
                  </button>
                  <button
                    onClick={handleClockOut}
                    className="bg-rose-600/80 hover:bg-rose-600 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Clock Out
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center font-bold">Duty finished for today. Clock logs synced.</p>
              )}
            </div>
          )}
        </div>

        {/* Stopwatch Active Time Tracker */}
        <div className="glass-panel p-6 rounded-2xl space-y-5 lg:col-span-2 relative overflow-hidden">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-fuchsia-400" /> Live Stopwatch Time Tracker
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Task Context</label>
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
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Time log note (optional)</label>
                  <input
                    type="text"
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                    placeholder="Describe progress details..."
                  />
                </div>
              )}

              <div className="flex gap-3">
                {!timerRunning ? (
                  <button
                    onClick={handleStartTimer}
                    className="flex-1 bg-neon-gradient hover:opacity-95 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> Start Stopwatch
                  </button>
                ) : (
                  <button
                    onClick={handleStopTimer}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Square className="w-4 h-4" /> Stop & Log Time
                  </button>
                )}
              </div>
            </div>

            {/* Timer visual block */}
            <div className="flex flex-col items-center justify-center bg-slate-950/45 border border-slate-900/60 p-6 rounded-2xl h-full">
              <span className="text-3xl font-extrabold font-mono text-glow text-violet-400 animate-pulse">
                {formatTime(timerSeconds)}
              </span>
              <span className="text-3xs uppercase tracking-widest text-slate-500 font-mono mt-1">
                {timerRunning ? 'Timer active' : 'Stopwatch standby'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Board columns */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-violet-400" /> My Assigned Task Board
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New / Assigned */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              New / Assigned ({myTasks.filter(t => t.status === 'New' || t.status === 'Assigned').length})
            </h4>
            <div className="space-y-3">
              {myTasks.filter(t => t.status === 'New' || t.status === 'Assigned').map(t => (
                <div key={t.id} className="glass-card p-4 rounded-xl space-y-3 border-l-2 border-l-violet-500">
                  <div>
                    <span className="bg-slate-950 text-violet-400 text-3xs px-2 py-0.5 rounded font-mono font-bold">
                      {t.priority}
                    </span>
                    <h5 className="font-bold text-sm text-slate-200 mt-1">{t.title}</h5>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.description}</p>
                  </div>
                  <div className="flex justify-between items-center text-3xs text-slate-500 border-t border-slate-900 pt-2">
                    <span>Due: {t.dueDate}</span>
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                      className="bg-violet-600/20 hover:bg-violet-650/40 text-violet-400 px-2.5 py-1 rounded-lg border border-violet-500/25 transition cursor-pointer font-bold"
                    >
                      Start Work
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress / Review */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              In Progress / Review ({myTasks.filter(t => t.status === 'In Progress' || t.status === 'Review').length})
            </h4>
            <div className="space-y-3">
              {myTasks.filter(t => t.status === 'In Progress' || t.status === 'Review').map(t => (
                <div key={t.id} className="glass-card p-4 rounded-xl space-y-3 border-l-2 border-l-fuchsia-500">
                  <div>
                    <span className="bg-slate-950 text-fuchsia-400 text-3xs px-2 py-0.5 rounded font-mono font-bold">
                      {t.status}
                    </span>
                    <h5 className="font-bold text-sm text-slate-200 mt-1">{t.title}</h5>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.description}</p>
                  </div>
                  <div className="flex justify-between items-center text-3xs text-slate-500 border-t border-slate-900 pt-2">
                    <span>Due: {t.dueDate}</span>
                    <div className="flex gap-1.5">
                      {t.status === 'In Progress' ? (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'Review')}
                          className="bg-fuchsia-600/20 hover:bg-fuchsia-650/40 text-fuchsia-400 px-2.5 py-1 rounded-lg border border-fuchsia-500/25 transition cursor-pointer font-bold"
                        >
                          Request Review
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'Completed')}
                          className="bg-emerald-600/20 hover:bg-emerald-650/40 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/25 transition cursor-pointer font-bold"
                        >
                          Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completed / Closed */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              Completed / Blocked ({myTasks.filter(t => t.status === 'Completed' || t.status === 'Blocked').length})
            </h4>
            <div className="space-y-3">
              {myTasks.filter(t => t.status === 'Completed' || t.status === 'Blocked').map(t => (
                <div key={t.id} className="glass-card p-4 rounded-xl space-y-3 border-l-2 border-l-emerald-500">
                  <div>
                    <span className="bg-slate-950 text-emerald-400 text-3xs px-2 py-0.5 rounded font-mono font-bold">
                      {t.status}
                    </span>
                    <h5 className="font-bold text-sm text-slate-200 mt-1">{t.title}</h5>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.description}</p>
                  </div>
                  <div className="flex justify-between items-center text-3xs text-slate-500 border-t border-slate-900 pt-2">
                    <span>Closed on: {t.dueDate}</span>
                    <span className="text-emerald-400 font-bold text-3xs flex items-center gap-1">✔ Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Manual Time Log entry */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-400" /> Manual Timelog Entry
          </h3>
          <form onSubmit={handleManualLog} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Task Context</label>
              <select
                value={manualTaskId}
                onChange={(e) => setManualTaskId(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                required
              >
                <option value="">-- Choose Task --</option>
                {myTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hours Spent</label>
              <input
                type="number"
                step="0.5"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="2.5"
                min="0.5"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description of Work</label>
              <textarea
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm h-16"
                placeholder="Wrote client-specific REST endpoints..."
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer"
            >
              Submit Manual Timelog
            </button>
          </form>
        </div>

        {/* Timelog History Logs */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-slate-100">My Logged Timesheet</h3>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {myLogs.length === 0 ? (
              <p className="text-slate-400 text-center py-10 text-xs">No logged hours reported yet.</p>
            ) : (
              myLogs.map(log => {
                const task = tasks.find(t => t.id === log.taskId);
                return (
                  <div key={log.id} className="glass-card p-4 rounded-xl flex items-start justify-between gap-4 border-l-2 border-l-fuchsia-500">
                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-slate-200">{task ? task.title : 'General Work'}</h5>
                      <p className="text-2xs text-slate-400 line-clamp-1 italic">"{log.description}"</p>
                      <p className="text-3xs text-slate-500">{log.date}</p>
                    </div>
                    <span className="bg-fuchsia-500/10 text-fuchsia-400 text-xs px-2.5 py-1 rounded-xl font-bold font-mono">
                      {log.hours} Hrs
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
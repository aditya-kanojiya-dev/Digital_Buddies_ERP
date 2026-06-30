import React, { useMemo, useState } from 'react';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckSquare,
    Plane, Briefcase, Home, AlertCircle, X,
} from 'lucide-react';
import TaskDetailPanel from './TaskDetailPanel';

// ─── Date helpers ────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayStr = () => new Date().toISOString().split('T')[0];
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const toDateStr = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const PRIORITY_DOT = {
    High: 'bg-rose-500',
    Medium: 'bg-amber-500',
    Low: 'bg-slate-500',
};

const STATUS_TEXT = {
    New: 'text-slate-400',
    'In Progress': 'text-indigo-400',
    Review: 'text-amber-400',
    Done: 'text-emerald-400',
    Blocked: 'text-rose-400',
};

const LEAVE_COLORS = {
    Sick: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    Casual: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Earned: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    default: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
};

/** Expand a leave's [startDate, endDate] range into individual yyyy-mm-dd strings. */
const expandLeaveDays = (leave) => {
    const days = [];
    if (!leave.startDate || !leave.endDate) return days;
    const start = new Date(leave.startDate + 'T00:00:00Z');
    const end = new Date(leave.endDate + 'T00:00:00Z');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return days;
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
};

/**
 * PersonalCalendar — a per-employee month calendar showing everything that
 * touches that one person's schedule: tasks assigned to them, their leave
 * (approved + pending), and their attendance log. Reused as both the
 * dedicated "My Calendar" tab and (in compact mode) the Dashboard widget.
 *
 * Props:
 *   user:        the logged-in employee (session user)
 *   state:       full app state ({ tasks, leaves, attendance, ... })
 *   updateState: passed straight through to TaskDetailPanel for comments/status edits
 *   compact:     if true, renders a condensed "upcoming" list instead of a
 *                full grid — used for the Dashboard widget
 *   onExpand:    optional () => void, shown as a "View full calendar" link in compact mode
 */
export default function PersonalCalendar({ user, state, updateState, compact = false, onExpand }) {
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [selectedTask, setSelectedTask] = useState(null);
    const [dayDetail, setDayDetail] = useState(null); // yyyy-mm-dd or null

    const myTasks = useMemo(
        () => (state.tasks || []).filter(t => t.assignedTo === user.id),
        [state.tasks, user.id]
    );
    const myLeaves = useMemo(
        () => (state.leaves || []).filter(l => l.employeeId === user.id),
        [state.leaves, user.id]
    );
    const myAttendance = useMemo(
        () => (state.attendance || []).filter(a => a.employeeId === user.id),
        [state.attendance, user.id]
    );

    // Build a single lookup: { 'yyyy-mm-dd': { tasks: [], leaves: [], attendance: null } }
    const dayIndex = useMemo(() => {
        const idx = {};
        const ensure = (date) => {
            if (!idx[date]) idx[date] = { tasks: [], leaves: [], attendance: null };
            return idx[date];
        };
        myTasks.forEach(t => {
            if (t.dueDate) ensure(t.dueDate).tasks.push(t);
        });
        myLeaves.forEach(l => {
            expandLeaveDays(l).forEach(date => ensure(date).leaves.push(l));
        });
        myAttendance.forEach(a => {
            if (a.logDate) ensure(a.logDate).attendance = a;
        });
        return idx;
    }, [myTasks, myLeaves, myAttendance]);

    // ── Compact "upcoming" widget for the Dashboard ─────────────────────────
    if (compact) {
        const today = todayStr();
        const upcoming = Object.entries(dayIndex)
            .filter(([date]) => date >= today)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(0, 5);

        return (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-violet-400" /> My Calendar
                    </h3>
                    {onExpand && (
                        <button
                            onClick={onExpand}
                            className="text-3xs font-bold uppercase tracking-wider text-violet-400 hover:text-violet-300 cursor-pointer"
                        >
                            View Full Calendar →
                        </button>
                    )}
                </div>

                {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">Nothing scheduled in the days ahead. You're clear.</p>
                ) : (
                    <div className="space-y-2.5">
                        {upcoming.map(([date, day]) => (
                            <div key={date} className="flex items-start gap-3 text-sm">
                                <div className="w-14 flex-shrink-0 text-3xs font-bold text-slate-400 pt-0.5">
                                    {new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                </div>
                                <div className="flex-1 space-y-1">
                                    {day.tasks.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTask(t)}
                                            className="flex items-center gap-1.5 text-slate-200 hover:text-violet-300 cursor-pointer text-left"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                            {t.title}
                                        </button>
                                    ))}
                                    {day.leaves.map(l => (
                                        <div key={l.id} className="flex items-center gap-1.5 text-amber-400">
                                            <Plane className="w-3 h-3" /> {l.type} Leave
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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

    // ── Full month grid ──────────────────────────────────────────────────────
    const { year, month } = cursor;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const goPrev = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
    const goNext = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });
    const goToday = () => { const d = new Date(); setCursor({ year: d.getFullYear(), month: d.getMonth() }); };

    const attendanceDot = (att) => {
        if (!att) return null;
        if (att.status === 'Present') return att.type === 'WFH' ? 'bg-indigo-500' : 'bg-emerald-500';
        if (att.status === 'Absent') return 'bg-rose-500';
        return 'bg-slate-500';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-violet-400" /> My Calendar
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={goPrev} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-slate-200 w-36 text-center">
                            {MONTH_NAMES[month]} {year}
                        </span>
                        <button onClick={goNext} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={goToday}
                            className="ml-2 text-3xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-5 text-3xs text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> High priority task</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium priority task</span>
                    <span className="flex items-center gap-1.5"><Plane className="w-3 h-3 text-amber-400" /> Leave</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Present (Office)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Present (WFH)</span>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="text-3xs font-bold uppercase tracking-wider text-slate-500 text-center py-1">{d}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {cells.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} />;
                        const dateStr = toDateStr(year, month, day);
                        const isToday = dateStr === todayStr();
                        const cell = dayIndex[dateStr];
                        const hasContent = cell && (cell.tasks.length > 0 || cell.leaves.length > 0 || cell.attendance);

                        return (
                            <button
                                key={dateStr}
                                onClick={() => hasContent && setDayDetail(dateStr)}
                                className={`min-h-[88px] rounded-xl border p-2 text-left align-top transition cursor-pointer
                                    ${isToday ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/60'}`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-xs font-bold ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>{day}</span>
                                    {cell?.attendance && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${attendanceDot(cell.attendance)}`} title={cell.attendance.status} />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {(cell?.tasks || []).slice(0, 2).map(t => (
                                        <div key={t.id} className="flex items-center gap-1 text-3xs truncate">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                            <span className="truncate text-slate-300">{t.title}</span>
                                        </div>
                                    ))}
                                    {cell?.tasks?.length > 2 && (
                                        <div className="text-3xs text-slate-500">+{cell.tasks.length - 2} more</div>
                                    )}
                                    {(cell?.leaves || []).slice(0, 1).map(l => (
                                        <div key={l.id} className="flex items-center gap-1 text-3xs text-amber-400 truncate">
                                            <Plane className="w-2.5 h-2.5 flex-shrink-0" /> {l.type}
                                        </div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Day detail modal */}
            {dayDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDayDetail(null)}>
                    <div
                        className="glass-panel border border-violet-500/20 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <h3 className="font-bold text-slate-100 text-base">
                                {new Date(dayDetail + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                            </h3>
                            <button onClick={() => setDayDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {dayIndex[dayDetail]?.attendance && (
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    {dayIndex[dayDetail].attendance.type === 'WFH' ? <Home className="w-4 h-4 text-indigo-400" /> : <Briefcase className="w-4 h-4 text-emerald-400" />}
                                    {dayIndex[dayDetail].attendance.status} ({dayIndex[dayDetail].attendance.type}) ·
                                    <Clock className="w-3.5 h-3.5 ml-1" /> {dayIndex[dayDetail].attendance.clockIn} – {dayIndex[dayDetail].attendance.clockOut || '—'}
                                </div>
                            )}

                            {(dayIndex[dayDetail]?.leaves || []).map(l => (
                                <div key={l.id} className={`p-3 rounded-xl border text-sm ${LEAVE_COLORS[l.type] || LEAVE_COLORS.default}`}>
                                    <div className="flex items-center gap-2 font-semibold"><Plane className="w-4 h-4" /> {l.type} Leave · {l.status}</div>
                                    {l.reason && <p className="text-xs mt-1 opacity-80">{l.reason}</p>}
                                </div>
                            ))}

                            {(dayIndex[dayDetail]?.tasks || []).length === 0 && !dayIndex[dayDetail]?.leaves?.length ? null : null}

                            {(dayIndex[dayDetail]?.tasks || []).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setSelectedTask(t); setDayDetail(null); }}
                                    className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-900 hover:border-violet-500/30 transition cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                                            <CheckSquare className="w-4 h-4 text-violet-400" /> {t.title}
                                        </span>
                                        <span className={`text-3xs font-bold uppercase ${STATUS_TEXT[t.status] || 'text-slate-400'}`}>{t.status}</span>
                                    </div>
                                    {t.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{t.description}</p>}
                                    <div className="flex items-center gap-3 mt-2 text-3xs text-slate-500">
                                        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t.priority} priority</span>
                                        {t.department && <span>· {t.department}</span>}
                                    </div>
                                </button>
                            ))}

                            {!dayIndex[dayDetail]?.tasks?.length && !dayIndex[dayDetail]?.leaves?.length && !dayIndex[dayDetail]?.attendance && (
                                <p className="text-sm text-slate-500">Nothing logged for this day.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

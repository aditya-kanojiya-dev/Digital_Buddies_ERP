import React, { useMemo, useState } from 'react';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
    Plane, Briefcase, Home, X, List, Grid3X3, Columns, CalendarDays,
    Search, Filter, Plus, Edit3, Trash2,
} from 'lucide-react';
import TaskDetailPanel from './TaskDetailPanel';
import { db } from '../../data/db';
import { DatePicker } from '../ui';

// ─── Date helpers ────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayStr = () => new Date().toISOString().split('T')[0];
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const toDateStr = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split('T')[0];
};

const getWeekStart = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day;
    d.setUTCDate(diff);
    return d.toISOString().split('T')[0];
};

// ─── Colors ──────────────────────────────────────────────────────────────────
const PRIORITY_DOT = {
    Emergency: 'bg-red-600',
    High: 'bg-rose-500',
    Medium: 'bg-amber-500',
    Low: 'bg-slate-500',
};

const PRIORITY_BG = {
    Emergency: 'bg-red-600/15 text-red-400 border-red-600/20',
    High: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Low: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const STATUS_TEXT = {
    New: 'text-slate-400',
    'In Progress': 'text-indigo-400',
    Review: 'text-amber-400',
    Done: 'text-emerald-400',
    Blocked: 'text-rose-400',
};

const DEPT_CALENDAR_COLORS = {
    'Paid Ads':               { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
    'Social Media':           { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-500' },
    'Video Editors':          { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-500' },
    'Graphic Designers':      { bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/30',   dot: 'bg-pink-500' },
    'Videography/Photography':{ bg: 'bg-teal-500/15',   text: 'text-teal-400',   border: 'border-teal-500/30',   dot: 'bg-teal-500' },
    'Developers':             { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30',   dot: 'bg-blue-500' },
    'HR':                     { bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30',dot: 'bg-emerald-500' },
};

const DEPT_BORDER_LEFT = {
    'Paid Ads':               'border-l-orange-500',
    'Social Media':           'border-l-violet-500',
    'Video Editors':          'border-l-red-500',
    'Graphic Designers':      'border-l-pink-500',
    'Videography/Photography':'border-l-teal-500',
    'Developers':             'border-l-blue-500',
    'HR':                     'border-l-emerald-500',
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

const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const ALL_STATUSES = ['New', 'In Progress', 'Review', 'Completed', 'Blocked'];
const ALL_PRIORITIES = ['Emergency', 'High', 'Medium', 'Low'];
const ALL_DEPARTMENTS = ['Paid Ads', 'Social Media', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Developers', 'HR'];

/**
 * PersonalCalendar — enhanced per-employee calendar with month, week, day,
 * and agenda views, color coding by department, and filter bar.
 *
 * Props:
 *   user:        the logged-in employee
 *   state:       full app state
 *   updateState: passed to TaskDetailPanel
 *   compact:     condensed "upcoming" list for the Dashboard widget
 *   onExpand:    () => void, "View full calendar" link in compact mode
 */
export default function PersonalCalendar({ user, state, updateState, compact = false, onExpand }) {
    // ── Navigation state ────────────────────────────────────────────────────
    const today = todayStr();
    const [viewMode, setViewMode] = useState('month');
    const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
    const [dayCursor, setDayCursor] = useState(today);

    // ── UI state ────────────────────────────────────────────────────────────
    const [selectedTask, setSelectedTask] = useState(null);
    const [dayDetail, setDayDetail] = useState(null);

    // ── Filter state ────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        department: '',
        status: '',
        priority: '',
        search: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    // ── Personal task CRUD state ────────────────────────────────────────────
    const { personalTasks } = state;
    const [showPersonalForm, setShowPersonalForm] = useState(false);
    const [editingPersonalId, setEditingPersonalId] = useState(null);
    const [personalTitle, setPersonalTitle] = useState('');
    const [personalDate, setPersonalDate] = useState('');
    const [personalPriority, setPersonalPriority] = useState('Medium');
    const [personalDesc, setPersonalDesc] = useState('');

    const resetPersonalForm = () => {
        setEditingPersonalId(null);
        setPersonalTitle('');
        setPersonalDate('');
        setPersonalPriority('Medium');
        setPersonalDesc('');
    };

    const handleSavePersonalTask = async (e) => {
        e.preventDefault();
        if (!personalTitle.trim()) return;
        if (editingPersonalId) {
            const updated = (personalTasks || []).map(t =>
                t.id === editingPersonalId
                    ? { ...t, title: personalTitle.trim(), date: personalDate || t.date, priority: personalPriority, description: personalDesc.trim() }
                    : t
            );
            updateState({ personalTasks: updated });
            try { await db.updatePersonalTask(editingPersonalId, { title: personalTitle.trim(), date: personalDate, priority: personalPriority, description: personalDesc.trim() }); } catch {}
        } else {
            const newTask = {
                id: `PT${Date.now()}`,
                userId: user.id,
                title: personalTitle.trim(),
                date: personalDate || today,
                priority: personalPriority,
                description: personalDesc.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
            };
            updateState({ personalTasks: [...(personalTasks || []), newTask] });
            try { await db.addPersonalTask(newTask); } catch {}
        }
        resetPersonalForm();
        setShowPersonalForm(false);
    };

    const handleEditPersonalTask = (task) => {
        setEditingPersonalId(task.id);
        setPersonalTitle(task.title);
        setPersonalDate(task.date || '');
        setPersonalPriority(task.priority || 'Medium');
        setPersonalDesc(task.description || '');
        setShowPersonalForm(true);
    };

    const handleDeletePersonalTask = async (id) => {
        if (!window.confirm('Delete this personal task?')) return;
        updateState({ personalTasks: (personalTasks || []).filter(t => t.id !== id) });
        try { await db.deletePersonalTask(id); } catch {}
    };

    const handleTogglePersonalCompleted = (id) => {
        const updated = (personalTasks || []).map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        updateState({ personalTasks: updated });
        const task = updated.find(t => t.id === id);
        if (task) try { db.updatePersonalTask(id, { completed: task.completed }); } catch {}
    };

    const openAddPersonalTask = (dateStr) => {
        resetPersonalForm();
        setPersonalDate(dateStr || today);
        setShowPersonalForm(true);
    };

    // ── Task/leave/attendance data ──────────────────────────────────────────
    const myTasks = useMemo(
        () => (state.tasks || []).filter(t =>
            t.assignedTo === user.id || t.assignedTo2 === user.id
        ),
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

    // Apply filters
    const filteredTasks = useMemo(() => {
        let result = myTasks;
        if (filters.department) {
            result = result.filter(t => t.department === filters.department);
        }
        if (filters.status) {
            result = result.filter(t => t.status === filters.status);
        }
        if (filters.priority) {
            result = result.filter(t => t.priority === filters.priority);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(t => t.title.toLowerCase().includes(q));
        }
        return result;
    }, [myTasks, filters]);

    // ── Week dates (used by week view) ─────────────────────────────────────
    const weekDates = useMemo(() => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            dates.push(addDays(weekStart, i));
        }
        return dates;
    }, [weekStart]);

    // ── Day index (used by month, week, day views) ──────────────────────────
    const dayIndex = useMemo(() => {
        const idx = {};
        const ensure = (date) => {
            if (!idx[date]) idx[date] = { tasks: [], leaves: [], attendance: null, personal: [] };
            return idx[date];
        };
        filteredTasks.forEach(t => {
            if (t.dueDate) ensure(t.dueDate).tasks.push(t);
            if (t.scheduledDate && t.scheduledDate !== t.dueDate) {
                ensure(t.scheduledDate).tasks.push(t);
            }
        });
        (personalTasks || []).forEach(t => {
            if (t.date) ensure(t.date).personal.push(t);
        });
        myLeaves.forEach(l => {
            expandLeaveDays(l).forEach(date => ensure(date).leaves.push(l));
        });
        myAttendance.forEach(a => {
            if (a.logDate) ensure(a.logDate).attendance = a;
        });
        return idx;
    }, [filteredTasks, personalTasks, myLeaves, myAttendance]);

    // ── Compact "upcoming" widget for the Dashboard ─────────────────────────
    if (compact) {
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
                                    {formatDateDisplay(date)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    {day.tasks.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTask(t)}
                                            className="flex items-center gap-1.5 text-slate-200 hover:text-violet-300 cursor-pointer text-left"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                            {t.title}
                                        </button>
                                    ))}
                                    {day.leaves.map(l => (
                                        <div key={l.id} className="flex items-center gap-1.5 text-amber-400">
                                            <Plane className="w-3 h-3" /> {l.type} Leave
                                        </div>
                                    ))}
                                    {(day.personal || []).map(t => (
                                        <div key={t.id} className="flex items-center gap-1.5 text-fuchsia-400">
                                            📌 {t.title}
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

    // ── Full calendar views ─────────────────────────────────────────────────

    // ── Month view helpers ─────────────────────────────────────────────────
    const { year, month } = cursor;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthCells = [];
    for (let i = 0; i < firstDay; i++) monthCells.push(null);
    for (let d = 1; d <= daysInMonth; d++) monthCells.push(d);

    const goPrevMonth = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
    const goNextMonth = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });

    const goPrevWeek = () => setWeekStart(prev => addDays(prev, -7));
    const goNextWeek = () => setWeekStart(prev => addDays(prev, 7));

    // ── Day view helpers ───────────────────────────────────────────────────

    const goPrevDay = () => setDayCursor(prev => addDays(prev, -1));
    const goNextDay = () => setDayCursor(prev => addDays(prev, 1));

    // ── Generic today ──────────────────────────────────────────────────────
    const goToday = () => {
        const d = new Date();
        setCursor({ year: d.getFullYear(), month: d.getMonth() });
        setWeekStart(getWeekStart(today));
        setDayCursor(today);
    };

    const attendanceDot = (att) => {
        if (!att) return null;
        if (att.status === 'Present') return att.type === 'WFH' ? 'bg-indigo-500' : 'bg-emerald-500';
        if (att.status === 'Absent') return 'bg-rose-500';
        return 'bg-slate-500';
    };

    const clearFilters = () => setFilters({ department: '', status: '', priority: '', search: '' });

    const activeFilterCount = [filters.department, filters.status, filters.priority, filters.search].filter(Boolean).length;

    // ── Render view header ─────────────────────────────────────────────────
    const renderViewHeader = () => {
        let title = '';
        if (viewMode === 'month') title = `${MONTH_NAMES[month]} ${year}`;
        else if (viewMode === 'week') {
            const start = new Date(weekDates[0] + 'T00:00:00Z');
            const end = new Date(weekDates[6] + 'T00:00:00Z');
            const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
            const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
            const startDay = start.getUTCDate();
            const endDay = end.getUTCDate();
            title = startMonth === endMonth
                ? `${startMonth} ${startDay} – ${endDay}, ${start.getUTCFullYear()}`
                : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${start.getUTCFullYear()}`;
        } else if (viewMode === 'day') {
            title = new Date(dayCursor + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        } else {
            title = 'Upcoming Events';
        }
        return title;
    };

    const renderNavButtons = () => {
        const onPrev = viewMode === 'month' ? goPrevMonth : viewMode === 'week' ? goPrevWeek : goPrevDay;
        const onNext = viewMode === 'month' ? goNextMonth : viewMode === 'week' ? goNextWeek : goNextDay;
        return (
            <div className="flex items-center gap-2">
                <button onClick={onPrev} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-slate-200 text-center min-w-[200px]">{renderViewHeader()}</span>
                <button onClick={onNext} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    onClick={goToday}
                    className="ml-2 text-3xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                    Today
                </button>
            </div>
        );
    };

    // ── Task item renderer (reused across views) ───────────────────────────
    const renderTaskItem = (t, compact = false) => {
        const deptColor = DEPT_CALENDAR_COLORS[t.department] || DEPT_CALENDAR_COLORS['Social Media'];
        return (
            <button
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className={`w-full text-left p-2.5 rounded-xl bg-slate-950 border hover:border-violet-500/30 transition cursor-pointer ${DEPT_BORDER_LEFT[t.department] || 'border-l-slate-600'} border-slate-900 border-l-2`}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5 ${compact ? 'text-3xs' : ''}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${deptColor.dot}`} />
                        {t.title}
                    </span>
                    <span className={`text-3xs font-bold uppercase shrink-0 ${STATUS_TEXT[t.status] || 'text-slate-400'}`}>{t.status}</span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-3xs text-slate-500">
                    <span className={`text-3xs px-1.5 py-0.5 rounded-full ${PRIORITY_BG[t.priority] || 'bg-slate-700 text-slate-400'}`}>
                        {t.priority}
                    </span>
                    {t.department && (
                        <span className={`text-3xs px-1.5 py-0.5 rounded-full ${deptColor.bg} ${deptColor.text}`}>
                            {t.department}
                        </span>
                    )}
                    {t.dueDate && <span>Due {t.dueDate}</span>}
                </div>
            </button>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-4 animate-fade-in">
            {/* ── Header: view mode toggle + nav ── */}
            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                        {[
                            { mode: 'month', icon: Grid3X3, label: 'Month' },
                            { mode: 'week', icon: Columns, label: 'Week' },
                            { mode: 'day', icon: CalendarDays, label: 'Day' },
                            { mode: 'agenda', icon: List, label: 'Agenda' },
                        ].map(({ mode, icon: Icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                    viewMode === mode ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>
                    {renderNavButtons()}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPersonalForm(true)}
                            className="p-2 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition cursor-pointer"
                            title="Add personal task"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className={`p-2 rounded-xl transition cursor-pointer ${
                                showFilters || activeFilterCount > 0 ? 'bg-violet-600/20 text-violet-400' : 'hover:bg-slate-800 text-slate-400'
                            }`}
                            title="Toggle filters"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-3xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            >
                                Clear ({activeFilterCount})
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Filter bar ── */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-3xs text-slate-500 mb-1">Department</label>
                                <select
                                    value={filters.department}
                                    onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
                                    className="w-full glass-input p-2 rounded-lg text-xs"
                                >
                                    <option value="">All departments</option>
                                    {ALL_DEPARTMENTS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-3xs text-slate-500 mb-1">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                    className="w-full glass-input p-2 rounded-lg text-xs"
                                >
                                    <option value="">All statuses</option>
                                    {ALL_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-3xs text-slate-500 mb-1">Priority</label>
                                <select
                                    value={filters.priority}
                                    onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                                    className="w-full glass-input p-2 rounded-lg text-xs"
                                >
                                    <option value="">All priorities</option>
                                    {ALL_PRIORITIES.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-3xs text-slate-500 mb-1">
                                    <Search className="w-3 h-3 inline mr-1" /> Search
                                </label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                                    className="w-full glass-input p-2 rounded-lg text-xs"
                                    placeholder="Search tasks…"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Legend (month/week view) ── */}
            {(viewMode === 'month' || viewMode === 'week') && (
                <div className="flex flex-wrap items-center gap-4 text-3xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> High priority</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium priority</span>
                    <span className="flex items-center gap-1.5 text-fuchsia-400">📌 Personal task</span>
                    <span className="flex items-center gap-1.5"><Plane className="w-3 h-3 text-amber-400" /> Leave</span>
                    {ALL_DEPARTMENTS.slice(0, 4).map(d => (
                        <span key={d} className={`flex items-center gap-1.5 ${DEPT_CALENDAR_COLORS[d]?.text || 'text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${DEPT_CALENDAR_COLORS[d]?.dot || 'bg-slate-500'}`} /> {d}
                        </span>
                    ))}
                </div>
            )}

            {/* ══ MONTH VIEW ════════════════════════════════════════════════ */}
            {viewMode === 'month' && (
                <div className="glass-panel p-4 rounded-2xl">
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {DAY_NAMES.map(d => (
                            <div key={d} className="text-3xs font-bold uppercase tracking-wider text-slate-500 text-center py-1">{d}</div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {monthCells.map((day, i) => {
                            if (day === null) return <div key={`empty-${i}`} />;
                            const dateStr = toDateStr(year, month, day);
                            const isToday = dateStr === today;
                            const cell = dayIndex[dateStr];
                            const hasContent = cell && (cell.tasks.length > 0 || cell.leaves.length > 0 || cell.attendance || (cell.personal || []).length > 0);

                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => setDayDetail(dateStr)}
                                    className={`min-h-[88px] rounded-xl border p-2 text-left align-top transition cursor-pointer relative group
                                        ${isToday ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/60'}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-xs font-bold ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>{day}</span>
                                        {cell?.attendance && (
                                            <span className={`w-1.5 h-1.5 rounded-full ${attendanceDot(cell.attendance)}`} title={cell.attendance.status} />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {(cell?.personal || []).slice(0, 1).map(t => (
                                            <div key={t.id} className="flex items-center gap-1 text-3xs truncate">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                                <span className="truncate text-fuchsia-300">📌 {t.title}</span>
                                            </div>
                                        ))}
                                        {(cell?.tasks || []).slice(0, 2).map(t => (
                                            <div key={t.id} className="flex items-center gap-1 text-3xs truncate">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                                <span className="truncate text-slate-300">{t.title}</span>
                                            </div>
                                        ))}
                                        {cell?.tasks?.length > 2 && (
                                            <div className="text-3xs text-slate-500">+{cell.tasks.length - 2 + (cell.personal || []).length} more</div>
                                        )}
                                        {(cell?.leaves || []).slice(0, 1).map(l => (
                                            <div key={l.id} className="flex items-center gap-1 text-3xs text-amber-400 truncate">
                                                <Plane className="w-2.5 h-2.5 flex-shrink-0" /> {l.type}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); openAddPersonalTask(dateStr); }}
                                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg bg-fuchsia-600/80 text-white"
                                        title="Add personal task">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ WEEK VIEW ═════════════════════════════════════════════════ */}
            {viewMode === 'week' && (
                <div className="glass-panel p-4 rounded-2xl">
                    {/* Day-of-week header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDates.map(dateStr => {
                            const d = new Date(dateStr + 'T00:00:00Z');
                            const isToday = dateStr === today;
                            return (
                                <div key={dateStr} className="text-center">
                                    <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                                        {DAY_NAMES[d.getUTCDay()]}
                                    </div>
                                    <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>
                                        {d.getUTCDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {weekDates.map(dateStr => {
                            const isToday = dateStr === today;
                            const cell = dayIndex[dateStr];
                            const hasContent = cell && (cell.tasks.length > 0 || cell.leaves.length > 0 || (cell.personal || []).length > 0);
                            return (
                                <div
                                    key={dateStr}
                                    className={`min-h-[180px] rounded-xl border p-2 ${isToday ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-800 bg-slate-950/40'}`}
                                >
                                    <div className="space-y-1">
                                        {(cell?.personal || []).slice(0, 2).map(t => (
                                            <div key={t.id}
                                                onClick={() => handleEditPersonalTask(t)}
                                                className="flex items-center gap-1 text-3xs truncate p-1 rounded-lg hover:bg-fuchsia-800/30 cursor-pointer"
                                                title={t.title}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-slate-500'}`} />
                                                <span className="truncate text-fuchsia-300">📌 {t.title}</span>
                                            </div>
                                        ))}
                                        {(cell?.tasks || []).slice(0, 5).map(t => (
                                            <div key={t.id}
                                                onClick={() => setSelectedTask(t)}
                                                className="flex items-center gap-1 text-3xs truncate p-1 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                                                title={t.title}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DEPT_CALENDAR_COLORS[t.department]?.dot || 'bg-slate-500'}`} />
                                                <span className="truncate text-slate-300">{t.title}</span>
                                            </div>
                                        ))}
                                        {cell?.tasks?.length > 5 && (
                                            <div className="text-3xs text-slate-500 pl-1">+{cell.tasks.length - 5 + (cell.personal || []).length} more</div>
                                        )}
                                        {(cell?.leaves || []).slice(0, 1).map(l => (
                                            <div key={l.id} className="flex items-center gap-1 text-3xs text-amber-400 truncate">
                                                <Plane className="w-2.5 h-2.5 flex-shrink-0" /> {l.type}
                                            </div>
                                        ))}
                                        {!hasContent && (
                                            <div className="text-3xs text-slate-600 text-center pt-6">No events</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ DAY VIEW ══════════════════════════════════════════════════ */}
            {viewMode === 'day' && (
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="space-y-4">
                        {/* Attendance */}
                        {dayIndex[dayCursor]?.attendance && (
                            <div className="flex items-center gap-2 text-sm text-slate-300 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                {dayIndex[dayCursor].attendance.type === 'WFH' ? <Home className="w-4 h-4 text-indigo-400" /> : <Briefcase className="w-4 h-4 text-emerald-400" />}
                                {dayIndex[dayCursor].attendance.status} ({dayIndex[dayCursor].attendance.type}) ·
                                <Clock className="w-3.5 h-3.5 ml-1" /> {dayIndex[dayCursor].attendance.clockIn} – {dayIndex[dayCursor].attendance.clockOut || '—'}
                            </div>
                        )}
                        {/* Leaves */}
                        {(dayIndex[dayCursor]?.leaves || []).map(l => (
                            <div key={l.id} className={`p-3 rounded-xl border text-sm ${LEAVE_COLORS[l.type] || LEAVE_COLORS.default}`}>
                                <div className="flex items-center gap-2 font-semibold"><Plane className="w-4 h-4" /> {l.type} Leave · {l.status}</div>
                                {l.reason && <p className="text-xs mt-1 opacity-80">{l.reason}</p>}
                            </div>
                        ))}
                        {/* Personal tasks */}
                        {(dayIndex[dayCursor]?.personal || []).map(t => (
                            <div key={t.id} className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <input type="checkbox" checked={!!t.completed} onChange={() => handleTogglePersonalCompleted(t.id)}
                                        className="w-4 h-4 rounded accent-fuchsia-600 cursor-pointer shrink-0" />
                                    <div className="min-w-0">
                                        <span className={`text-sm font-semibold ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                            {t.title}
                                        </span>

                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <span className={`text-3xs px-1.5 py-0.5 rounded-full ${PRIORITY_BG[t.priority] || 'bg-slate-700 text-slate-400'}`}>
                                        {t.priority}
                                    </span>
                                    <button onClick={() => handleEditPersonalTask(t)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-violet-400 transition cursor-pointer" title="Edit">
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeletePersonalTask(t.id)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {/* Tasks */}
                        {(dayIndex[dayCursor]?.tasks || []).length === 0 && !dayIndex[dayCursor]?.leaves?.length && !dayIndex[dayCursor]?.attendance && !(dayIndex[dayCursor]?.personal || []).length && (
                            <p className="text-sm text-slate-500 text-center py-8">No events for this day.</p>
                        )}
                        {(dayIndex[dayCursor]?.tasks || []).map(t => renderTaskItem(t))}
                    </div>
                </div>
            )}

            {/* ══ AGENDA VIEW ════════════════════════════════════════════════ */}
            {viewMode === 'agenda' && (
                <div className="glass-panel p-6 rounded-2xl">
                    {Object.entries(dayIndex)
                        .filter(([date]) => date >= today)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">No upcoming events.</p>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(dayIndex)
                                .filter(([date]) => date >= today)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([date, day]) => (
                                    <div key={date}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`text-sm font-bold ${date === today ? 'text-violet-400' : 'text-slate-300'}`}>
                                                {formatDateDisplay(date)}
                                                {date === today && <span className="text-3xs text-violet-500 ml-2">Today</span>}
                                            </span>
                                            <span className="h-px flex-1 bg-slate-800" />
                                        </div>
                                        <div className="space-y-2 pl-2">
                                            {day.leaves.map(l => (
                                                <div key={l.id} className={`p-3 rounded-xl border text-sm ${LEAVE_COLORS[l.type] || LEAVE_COLORS.default}`}>
                                                    <div className="flex items-center gap-2 font-semibold"><Plane className="w-4 h-4" /> {l.type} Leave</div>
                                                </div>
                                            ))}
                                            {(day.personal || []).map(t => (
                                                <div key={t.id} className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <input type="checkbox" checked={!!t.completed} onChange={() => handleTogglePersonalCompleted(t.id)}
                                                            className="w-4 h-4 rounded accent-fuchsia-600 cursor-pointer shrink-0" />
                                                        <div className="min-w-0">
                                                            <span className={`text-sm font-semibold ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{t.title}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => handleEditPersonalTask(t)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-violet-400 transition cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                                                        <button onClick={() => handleDeletePersonalTask(t.id)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {day.tasks.map(t => renderTaskItem(t))}
                                            {day.leaves.length === 0 && day.tasks.length === 0 && (day.personal || []).length === 0 && (
                                                <p className="text-xs text-slate-600 py-2">Nothing scheduled.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Day detail modal (from month view click) ── */}
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
                            <button onClick={() => { setDayDetail(null); openAddPersonalTask(dayDetail); }}
                                className="w-full bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-400 border border-fuchsia-500/20 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2">
                                <Plus className="w-3.5 h-3.5" /> Add personal task on this day
                            </button>

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

                            {(dayIndex[dayDetail]?.personal || []).map(t => (
                                <div key={t.id} className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <input type="checkbox" checked={!!t.completed} onChange={() => handleTogglePersonalCompleted(t.id)}
                                            className="w-4 h-4 rounded accent-fuchsia-600 cursor-pointer shrink-0" />
                                        <div className="min-w-0">
                                            <span className={`text-sm font-semibold ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                {t.title}
                                            </span>

                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button onClick={() => { setDayDetail(null); handleEditPersonalTask(t); }} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-violet-400 transition cursor-pointer" title="Edit">
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => handleDeletePersonalTask(t.id)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer" title="Delete">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {(dayIndex[dayDetail]?.tasks || []).map(t => renderTaskItem(t))}

                            {!dayIndex[dayDetail]?.tasks?.length && !dayIndex[dayDetail]?.leaves?.length && !dayIndex[dayDetail]?.attendance && !(dayIndex[dayDetail]?.personal || []).length && (
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

            {/* ── Personal task form modal ── */}
            {showPersonalForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowPersonalForm(false); resetPersonalForm(); }}>
                    <div className="glass-panel border border-fuchsia-500/20 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <h3 className="font-bold text-slate-100 text-base">
                                {editingPersonalId ? 'Edit Personal Task' : 'New Personal Task'}
                            </h3>
                            <button onClick={() => { setShowPersonalForm(false); resetPersonalForm(); }}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSavePersonalTask} className="p-5 space-y-4">
                            <div>
                                <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Title</label>
                                <input type="text" value={personalTitle} onChange={e => setPersonalTitle(e.target.value)}
                                    className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Buy groceries" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Date</label>
                                    <DatePicker value={personalDate} onChange={setPersonalDate} />
                                </div>
                                <div>
                                    <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Priority</label>
                                    <select value={personalPriority} onChange={e => setPersonalPriority(e.target.value)}
                                        className="w-full glass-input p-3 rounded-xl text-sm">
                                        <option value="Emergency">Emergency</option>
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Description (optional)</label>
                                <textarea value={personalDesc} onChange={e => setPersonalDesc(e.target.value)}
                                    className="w-full glass-input p-3 rounded-xl text-sm h-24" placeholder="Details..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit"
                                    className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700 py-2.5 rounded-xl text-sm font-bold text-white transition cursor-pointer">
                                    {editingPersonalId ? 'Save Changes' : 'Add Task'}
                                </button>
                                <button type="button" onClick={() => { setShowPersonalForm(false); resetPersonalForm(); }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useEffect, useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon, Plus, X, Edit3, Trash2, Send, ChevronLeft, ChevronRight, MessageSquare,
} from 'lucide-react';
import { useToast } from './Toast';
import TaskDetailPanel from './TaskDetailPanel';
import { db } from '../../data/db';

// ─── Date / calendar helpers ────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const todayStr = () => new Date().toISOString().split('T')[0];
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const addDays = (yyyyMmDd, days) => {
    const d = new Date(yyyyMmDd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
};

const STATUS_STYLES = {
    Draft:     'bg-amber-500/15  text-amber-400',
    Scheduled: 'bg-indigo-500/15 text-indigo-400',
    Published: 'bg-emerald-500/15 text-emerald-400',
    Cancelled: 'bg-rose-500/15  text-rose-400',
};

const PLATFORM_COLORS = {
    Instagram:  { bg: 'bg-pink-500/15',    text: 'text-pink-400'    },
    LinkedIn:   { bg: 'bg-blue-500/15',    text: 'text-blue-400'    },
    Facebook:   { bg: 'bg-indigo-500/15',  text: 'text-indigo-400'  },
    YouTube:    { bg: 'bg-red-500/15',     text: 'text-red-400'     },
    Twitter:    { bg: 'bg-sky-500/15',     text: 'text-sky-400'     },
};

const ALL_DEPARTMENTS = [
    'Paid Ads','Social Media','Video Editors','Graphic Designers','Videography/Photography','Developers','HR',
];

// ── Modal wrapper (shared, identical to previous SM behavior) ───────────────
function Modal({ title, onClose, children, wide }) {
    useEffect(() => {
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`glass-panel border border-violet-500/20 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <h3 className="font-bold text-slate-100 text-base">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

/**
 * DeptCalendar — shared calendar widget for every department page.
 *
 * Renders a month grid showing:
 *   - **Tasks** belonging to this dept (`t.department === deptName || t.sourceDept === deptName`),
 *     plus a Creative-specific fallback that derives a date from `deadlineDaysPrior` for
 *     legacy tasks that don't carry a `dueDate`. With `scope='org'` (HR), shows all tasks.
 *   - **Posts** from `smmCalendar` only when `showPosts=true` (Social Media page).
 *
 * Props:
 *   user:                 session user
 *   state:                full app state
 *   updateState:          from App.jsx
 *   deptName:             string — e.g. "Video Editors"
 *   scope:                'dept' (default) | 'org'  — controls task visibility
 *   showPosts:            false (default) — set true on the SM page
 *   allowCrossDeptAssign: false (default) — managers only, enables the assign-to-dept modal
 */
export default function DeptCalendar({
    user,
    state,
    updateState,
    deptName,
    scope = 'dept',
    showPosts = false,
    allowCrossDeptAssign = false,
}) {
    const toast = useToast();
    const { smmCalendar, tasks, employees, notifications, taskComments } = state;

    const isManager    = user.role === 'Super Admin' || user.role === 'Manager';
    const isDeptMember = user.department === deptName;
    const canAddPost   = showPosts && (isManager || isDeptMember);
    const canAssign    = allowCrossDeptAssign && isManager;

    // ── Calendar nav ───────────────────────────────────────────────────────
    const now = new Date();
    const [calYear,  setCalYear]  = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const [, setTick]     = useState(0); // re-derive "today" when month changes

    // ── Modal state ────────────────────────────────────────────────────────
    const [selectedDay,   setSelectedDay]   = useState(null);
    const [editingPost,   setEditingPost]   = useState(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    // ── Post form state ────────────────────────────────────────────────────
    const blankPost = () => ({
        title: '', date: todayStr(), time: '12:00', platform: 'Instagram',
        caption: '', status: 'Scheduled', assignedDept: 'Social Media', notes: '',
    });
    const [postForm, setPostForm] = useState(blankPost());

    // ── Cross-dept assign form state ───────────────────────────────────────
    const blankTask = () => ({
        title: '', description: '', targetDept: 'Video Editors',
        assignedTo: '', dueDate: '', priority: 'Medium',
    });
    const [taskForm, setTaskForm] = useState(blankTask());

    // Recompute "today" whenever the month flips so derived dates stay current.
    useEffect(() => { setTick(t => t + 1); }, [calYear, calMonth]);

    // ── Visibility filters ─────────────────────────────────────────────────
    const dateStrFor = (y, m, d) =>
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const today = todayStr();

    /**
     * Tasks visible on a given day cell.
     *
     *   - Dept scope: `t.department === deptName || t.sourceDept === deptName`
     *   - Org scope (HR): all tasks
     *   - Creative fallback: tasks with `deadlineDaysPrior` and no `dueDate` are
     *     rendered on `today + daysPrior` so legacy Creative tasks stay visible.
     */
    const tasksOnDay = (dateStr) => {
        return tasks.filter(t => {
            // direct dueDate match
            if (t.dueDate === dateStr) {
                if (scope === 'org') return true;
                return t.department === deptName || t.sourceDept === deptName;
            }

            // Creative legacy: derive date from `deadlineDaysPrior`
            if (t.deadlineDaysPrior != null && !t.dueDate) {
                const derived = addDays(today, Number(t.deadlineDaysPrior));
                if (derived === dateStr) {
                    if (scope === 'org') return true;
                    return t.department === deptName || t.sourceDept === deptName;
                }
            }

            return false;
        });
    };

    /** Posts visible on a given day cell — only when showPosts is on. */
    const postsOnDay = (dateStr) => {
        if (!showPosts) return [];
        return smmCalendar.filter(p => p.date === dateStr);
    };

    // ── Permission helpers ────────────────────────────────────────────────
    const canChangeStatus = (task) =>
        isManager || task.assignedTo === user.id;

    // ── Status change handler ─────────────────────────────────────────────
    const handleStatusChange = (taskId, nextStatus) => {
        const t = tasks.find(x => x.id === taskId);
        if (!t) return;
        if (!canChangeStatus(t)) {
            toast.error('Only the assignee or a manager can change status.');
            return;
        }
        updateState({
            tasks: tasks.map(x => x.id === taskId ? { ...x, status: nextStatus } : x),
        });
        // Notify the task creator/assigner
        if (t.assignedBy && t.assignedBy !== user.id) {
            const now = new Date().toISOString();
            updateState({ notifications: [{
                id: `NTF${Date.now()}`,
                userId: t.assignedBy,
                message: `${user.name} moved "${t.title}" from "${t.status}" to "${nextStatus}".`,
                type: 'info',
                timestamp: now,
                read: false,
            }, ...(state.notifications || [])] });
        }
    };

    // ── Post CRUD ──────────────────────────────────────────────────────────
    const openAddPost = (dateStr) => {
        setEditingPost(null);
        setPostForm({ ...blankPost(), date: dateStr || today });
        setShowPostModal(true);
    };

    const openEditPost = (post) => {
        setEditingPost(post);
        setPostForm({ ...post });
        setShowPostModal(true);
    };

    const handleSavePost = () => {
        if (!postForm.title) { toast.error('Post title is required.'); return; }
        if (editingPost) {
            const updated = smmCalendar.map(p => p.id === editingPost.id ? { ...p, ...postForm } : p);
            updateState({ smmCalendar: updated });
            toast.success('Post updated on calendar.');
        } else {
            const newPost = {
                id: `POST${Date.now()}`,
                ...postForm,
                addedBy: user.name,
                addedById: user.id,
                createdAt: new Date().toISOString(),
            };
            updateState({ smmCalendar: [...smmCalendar, newPost] });
            // Notify target dept if it's not the source
            if (postForm.assignedDept && postForm.assignedDept !== 'Social Media') {
                const deptMembers = employees.filter(e => e.department === postForm.assignedDept);
                const now = new Date().toISOString();
                const newNotifs = deptMembers.map(emp => ({
                    id: `NTF${Date.now()}_${emp.id}`,
                    userId: emp.id,
                    message: `📅 New content task from ${deptName}: "${postForm.title}" on ${postForm.date}`,
                    type: 'assignment',
                    timestamp: now,
                    read: false,
                }));
                if (newNotifs.length) updateState({ notifications: [...notifications, ...newNotifs] });
            }
            toast.success(`"${postForm.title}" added to calendar.`);
        }
        setShowPostModal(false);
        setEditingPost(null);
        setPostForm(blankPost());
    };

    const handleDeletePost = (postId) => {
        if (!window.confirm('Delete this calendar entry?')) return;
        db.deleteCalendarPost(postId).catch(err => console.error(err));
        updateState({ smmCalendar: smmCalendar.filter(p => p.id !== postId) });
        toast.success('Entry removed from calendar.');
        setSelectedDay(null);
    };

    const handlePostStatusChange = (postId, newStatus) => {
        updateState({
            smmCalendar: smmCalendar.map(p => p.id === postId ? { ...p, status: newStatus } : p),
        });
    };

    // ── Cross-dept task assign ────────────────────────────────────────────
    const targetDeptEmployees = employees.filter(e => e.department === taskForm.targetDept);

    const handleAssignTask = () => {
        if (!taskForm.title || !taskForm.targetDept) {
            toast.error('Task title and target department are required.');
            return;
        }
        const newTask = {
            id: `TASK${Date.now()}`,
            title: taskForm.title,
            description: taskForm.description,
            assignedTo: taskForm.assignedTo || null,
            department: taskForm.targetDept,
            sourceDept: deptName,
            assignedBy: user.id,
            priority: taskForm.priority,
            projectId: 'General',
            dueDate: taskForm.dueDate || '',
            scheduledDate: null,
            status: 'New',
            createdAt: new Date().toISOString().split('T')[0],
        };
        updateState({ tasks: [...tasks, newTask] });

        // Notify assignee or whole target dept
        const toNotify = taskForm.assignedTo
            ? [employees.find(e => e.id === taskForm.assignedTo)].filter(Boolean)
            : employees.filter(e => e.department === taskForm.targetDept);
        const now = new Date().toISOString();
        const newNotifs = toNotify.map(emp => ({
            id: `NTF${Date.now()}_${emp.id}`,
            userId: emp.id,
            message: `📌 ${deptName} assigned you a task: "${taskForm.title}"${taskForm.dueDate ? ` — due ${taskForm.dueDate}` : ''}`,
            type: 'assignment',
            timestamp: now,
            read: false,
        }));
        if (newNotifs.length) updateState({ notifications: [...notifications, ...newNotifs] });

        toast.success(`Task "${taskForm.title}" assigned to ${taskForm.targetDept}.`);
        setShowTaskModal(false);
        setTaskForm(blankTask());
    };

    // ── Month nav ─────────────────────────────────────────────────────────
    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };
    const goToday = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); };

    // ── Pre-compute comment counts so we don't re-walk taskComments per cell
    const commentCounts = useMemo(() => (taskComments || []).reduce((acc, c) => {
        acc[c.taskId] = (acc[c.taskId] || 0) + 1;
        return acc;
    }, {}), [taskComments]);

    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay    = getFirstDayOfMonth(calYear, calMonth);

    const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

    // ═══════════════════════════════════════════════════════════════════════
    //  Render
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ── Action bar ── */}
            <div className="flex items-center justify-end gap-2">
                {canAddPost && (
                    <button onClick={() => openAddPost(today)} className="bg-neon-gradient px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                        <Plus className="w-4 h-4" /> Add Post
                    </button>
                )}
                {canAssign && (
                    <button onClick={() => setShowTaskModal(true)} className="bg-slate-800 hover:bg-slate-700 border border-violet-500/20 px-4 py-2 rounded-xl text-violet-300 text-xs font-bold flex items-center gap-2 transition">
                        <Send className="w-4 h-4" /> Assign to Dept
                    </button>
                )}
            </div>

            {/* ── Calendar grid ── */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-violet-500/10">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h2 className="text-lg font-extrabold text-slate-100 w-48 text-center">
                            {MONTH_NAMES[calMonth]} {calYear}
                        </h2>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button onClick={goToday} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition border border-slate-700">
                            Today
                        </button>
                    </div>
                    {showPosts && (
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            {Object.entries(PLATFORM_COLORS).slice(0, 4).map(([pl, c]) => (
                                <span key={pl} className={`flex items-center gap-1 ${c.text}`}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
                                    {pl}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 border-b border-slate-800">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7">
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e${i}`} className="min-h-[100px] border-r border-b border-slate-800/50 bg-slate-900/20" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = dateStrFor(calYear, calMonth, day);
                        const dayPosts = postsOnDay(dateStr);
                        const dayTasks = tasksOnDay(dateStr);
                        const isToday  = dateStr === today;

                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDay({ day, dateStr, posts: dayPosts, tasks: dayTasks })}
                                className={`min-h-[100px] border-r border-b border-slate-800/50 p-1.5 cursor-pointer transition group relative
                                    ${isToday ? 'bg-violet-950/30' : 'hover:bg-slate-800/20'}`}
                            >
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                                    isToday ? 'bg-violet-600 text-white' : 'text-slate-400 group-hover:text-slate-200'
                                }`}>
                                    {day}
                                </div>

                                <div className="space-y-0.5">
                                    {/* Post chips (SM only) */}
                                    {dayPosts.slice(0, 3).map(post => {
                                        const c = PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.Instagram;
                                        return (
                                            <div key={post.id}
                                                className={`text-3xs px-1.5 py-0.5 rounded ${c.bg} ${c.text} truncate flex items-center gap-1`}
                                                title={post.title}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'currentColor' }} />
                                                {post.title}
                                            </div>
                                        );
                                    })}

                                    {/* Task chips */}
                                    {dayTasks.slice(0, 3).map(t => (
                                        <div key={t.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); }}
                                            className="text-3xs px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 truncate flex items-center gap-1 hover:bg-orange-500/25 cursor-pointer"
                                            title={t.title}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'currentColor' }} />
                                            <span className="truncate">{t.title}</span>
                                            {(commentCounts[t.id] || 0) > 0 && (
                                                <span className="ml-auto flex items-center gap-0.5 text-violet-400 flex-shrink-0">
                                                    <MessageSquare className="w-2.5 h-2.5" />
                                                    {commentCounts[t.id]}
                                                </span>
                                            )}
                                        </div>
                                    ))}

                                    {(dayPosts.length + dayTasks.length) > 4 && (
                                        <div className="text-3xs text-slate-500 pl-1">
                                            +{dayPosts.length + dayTasks.length - 4} more
                                        </div>
                                    )}
                                </div>

                                {canAddPost && (
                                    <button
                                        onClick={e => { e.stopPropagation(); openAddPost(dateStr); }}
                                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg bg-violet-600/80 text-white"
                                        title="Add post"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Day-detail modal ── */}
            {selectedDay && (
                <Modal
                    title={`${MONTH_NAMES[calMonth]} ${selectedDay.day}, ${calYear}`}
                    onClose={() => setSelectedDay(null)}
                    wide
                >
                    <div className="space-y-4">
                        {canAddPost && (
                            <button onClick={() => { setSelectedDay(null); openAddPost(selectedDay.dateStr); }}
                                className="w-full border border-dashed border-violet-500/40 rounded-xl py-2.5 text-violet-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-violet-500/5 transition">
                                <Plus className="w-4 h-4" /> Add post on this day
                            </button>
                        )}

                        {selectedDay.posts.length === 0 && selectedDay.tasks.length === 0 && (
                            <p className="text-slate-500 text-center py-6">Nothing scheduled for this day.</p>
                        )}

                        {selectedDay.posts.map(post => {
                            const c = PLATFORM_COLORS[post.platform] || PLATFORM_COLORS.Instagram;
                            return (
                                <div key={post.id} className={`glass-card rounded-xl border border-slate-800/80 p-4 space-y-2`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${c.bg} ${c.text}`}>{post.platform}</span>
                                            <h4 className="font-bold text-sm text-slate-200">{post.title}</h4>
                                            {post.caption && <p className="text-xs text-slate-400 italic">{post.caption}</p>}
                                            <p className="text-3xs text-slate-500">@ {post.time} · by {post.addedBy}</p>
                                        </div>
                                        {canAddPost && (
                                            <div className="flex gap-1">
                                                <button onClick={() => { setSelectedDay(null); openEditPost(post); }}
                                                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition">
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDeletePost(post.id)}
                                                    className="p-1.5 hover:bg-rose-900/40 rounded-lg text-slate-400 hover:text-rose-400 transition">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {canAddPost && (
                                        <div className="flex gap-2 pt-1 flex-wrap">
                                            {['Draft','Scheduled','Published','Cancelled'].map(s => (
                                                <button key={s}
                                                    onClick={() => {
                                                        handlePostStatusChange(post.id, s);
                                                        setSelectedDay(prev => ({
                                                            ...prev,
                                                            posts: prev.posts.map(p => p.id === post.id ? { ...p, status: s } : p),
                                                        }));
                                                    }}
                                                    className={`text-3xs px-2 py-0.5 rounded-full transition ${post.status === s ? STATUS_STYLES[s] : 'text-slate-500 hover:text-slate-300'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!canAddPost && (
                                        <span className={`text-3xs px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] || ''}`}>{post.status}</span>
                                    )}
                                </div>
                            );
                        })}

                        {selectedDay.tasks.map(t => {
                            const assignee = employees.find(e => e.id === t.assignedTo);
                            return (
                                <div key={t.id} className="glass-card rounded-xl border border-orange-500/20 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-3xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">📌 Task</span>
                                        <span className="text-3xs text-slate-500">{t.department}</span>
                                        <span className="text-3xs text-slate-500">·</span>
                                        <span className="text-3xs text-slate-500">{t.status}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-200">{t.title}</h4>
                                    {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-3xs text-slate-500">by {t.assignedBy || deptName} {assignee && `→ ${assignee.name}`}</p>
                                        <button onClick={() => setSelectedTaskId(t.id)}
                                            className="text-3xs text-violet-400 hover:text-violet-300 font-bold">
                                            Open →
                                        </button>
                                    </div>
                                    {canChangeStatus(t) && t.status !== 'Completed' && (
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            {t.status === 'New' && (
                                                <button onClick={() => { handleStatusChange(t.id, 'In Progress'); setSelectedDay(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, status: 'In Progress' } : x) })); }}
                                                    className="text-3xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2 py-0.5 rounded border border-violet-500/25">
                                                    Start
                                                </button>
                                            )}
                                            {t.status === 'In Progress' && (
                                                <button onClick={() => { handleStatusChange(t.id, 'Review'); setSelectedDay(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, status: 'Review' } : x) })); }}
                                                    className="text-3xs bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-500/25">
                                                    Request Review
                                                </button>
                                            )}
                                            {t.status === 'Review' && (
                                                <button onClick={() => { handleStatusChange(t.id, 'Completed'); setSelectedDay(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, status: 'Completed' } : x) })); }}
                                                    className="text-3xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/25">
                                                    Mark Done
                                                </button>
                                            )}
                                            <button onClick={() => { handleStatusChange(t.id, 'Completed'); setSelectedDay(prev => ({ ...prev, tasks: prev.tasks.map(x => x.id === t.id ? { ...x, status: 'Completed' } : x) })); }}
                                                className="text-3xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/25">
                                                Complete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Modal>
            )}

            {/* ── Post add/edit modal ── */}
            {showPostModal && (
                <Modal
                    title={editingPost ? 'Edit Calendar Entry' : 'Add to Content Calendar'}
                    onClose={() => { setShowPostModal(false); setEditingPost(null); setPostForm(blankPost()); }}
                    wide
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Post / Content Title *</label>
                            <input type="text" value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Skincare Serum Reel" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Date</label>
                                <input type="date" value={postForm.date} onChange={e => setPostForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full glass-input p-3 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Time</label>
                                <input type="time" value={postForm.time} onChange={e => setPostForm(f => ({ ...f, time: e.target.value }))}
                                    className="w-full glass-input p-3 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Platform</label>
                                <select value={postForm.platform} onChange={e => setPostForm(f => ({ ...f, platform: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {Object.keys(PLATFORM_COLORS).map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Status</label>
                                <select value={postForm.status} onChange={e => setPostForm(f => ({ ...f, status: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {['Draft','Scheduled','Published','Cancelled'].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Assign to Department (for content needs)</label>
                            <select value={postForm.assignedDept} onChange={e => setPostForm(f => ({ ...f, assignedDept: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                {['Social Media','Video Editors','Graphic Designers','Videography/Photography','Developers','Paid Ads'].map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Caption / Notes</label>
                            <textarea value={postForm.caption} onChange={e => setPostForm(f => ({ ...f, caption: e.target.value }))}
                                className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Include hashtags, tags, brief..." />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSavePost}
                                className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
                                <CalendarIcon className="w-4 h-4" /> {editingPost ? 'Save Changes' : 'Add to Calendar'}
                            </button>
                            <button onClick={() => { setShowPostModal(false); setEditingPost(null); setPostForm(blankPost()); }}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Cross-dept assign modal ── */}
            {showTaskModal && (
                <Modal title={`Assign Task to Another Department`} onClose={() => { setShowTaskModal(false); setTaskForm(blankTask()); }} wide>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
                            <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Create 3 reels for client campaign" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Description</label>
                            <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                                className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Details, references, links..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Target Department *</label>
                                <select value={taskForm.targetDept} onChange={e => setTaskForm(f => ({ ...f, targetDept: e.target.value, assignedTo: '' }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {ALL_DEPARTMENTS.filter(d => d !== deptName).map(d => <option key={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
                                <select value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    <option value="">Whole department</option>
                                    {targetDeptEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {['Low','Medium','High'].map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                                <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                                    className="w-full glass-input p-3 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleAssignTask}
                                className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
                                <Send className="w-4 h-4" /> Send Task
                            </button>
                            <button onClick={() => { setShowTaskModal(false); setTaskForm(blankTask()); }}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
                                Cancel
                            </button>
                        </div>
                        {targetDeptEmployees.length === 0 && (
                            <p className="text-xs text-slate-500 text-center">No employees found in {taskForm.targetDept} — task will be visible to that department when they check their workspace.</p>
                        )}
                    </div>
                </Modal>
            )}

            {/* ── Task detail panel (comments + timeline) ── */}
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
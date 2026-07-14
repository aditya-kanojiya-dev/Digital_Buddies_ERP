import React, { useEffect, useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon, Plus, X, Edit3, Trash2, Send, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useToast } from './Toast';
import TaskDetailPanel from './TaskDetailPanel';
import { db } from '../../data/db';
import { DatePicker } from '../ui';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';

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
    const { smmCalendar, tasks, employees, notifications } = state;

    const isManager    = user.role === 'Super Admin' || user.role === 'Manager';
    const isDeptMember = user.department?.includes(deptName);
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

    // ── Lead-time windows ─────────────────────────────────────────────────
    const DEPT_LEAD_WINDOWS = {
        'Videography/Photography': { lower: 5, upper: 7 },
        'Video Editors':           { lower: 3, upper: 5 },
        'Graphic Designers':       { lower: 3, upper: 5 },
    };

    // ── Post form state ────────────────────────────────────────────────────
    const blankPost = () => ({
        title: '', postDate: todayStr(), postTime: '12:00', platform: 'Instagram',
        caption: '', status: 'Draft',
        client_id: '', needs_videography: false, needs_video_editing: false, needs_graphic_design: false,
        assignedVideo: '', assignedGraphic: '', assignedPhoto: '', assignedPhotoSubType: '',
        needsBothRoles: false, assignedPhotoCo: '',
    });
    const [postForm, setPostForm] = useState(blankPost());

    // ── Cross-dept assign form state ───────────────────────────────────────
    const blankTask = () => ({
        title: '', description: '', targetDept: 'Video Editors',
        assignedTo: '', dueDate: '', priority: 'Medium',
    });
    const [taskForm, setTaskForm] = useState(blankTask());
    const [crossDeptSubType, setCrossDeptSubType] = useState('');
    const [crossDeptNeedsBoth, setCrossDeptNeedsBoth] = useState(false);
    const [crossDeptCoAssignee, setCrossDeptCoAssignee] = useState('');

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
        return smmCalendar.filter(p => p.postDate === dateStr);
    };

    // ── Permission helpers ────────────────────────────────────────────────
    const canChangeStatus = (task) =>
        isManager || task.assignedTo === user.id || task.assignedBy === user.id;

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
        setPostForm({ ...blankPost(), postDate: dateStr || today });
        setShowPostModal(true);
    };

    const openEditPost = (post) => {
        setEditingPost(post);
        setPostForm({ ...post });
        setShowPostModal(true);
    };

    const getSelectedDepts = (form) => {
        const depts = [];
        if (form.needs_videography) depts.push('Videography/Photography');
        if (form.needs_video_editing) depts.push('Video Editors');
        if (form.needs_graphic_design) depts.push('Graphic Designers');
        return depts;
    };

    const getAssigneeForForm = (form, dept) => {
        const map = {
            'Video Editors': 'assignedVideo',
            'Graphic Designers': 'assignedGraphic',
            'Videography/Photography': 'assignedPhoto',
        };
        return form[map[dept]] || '';
    };

    const getCoAssigneeForForm = (form) => form.assignedPhotoCo || '';

    const createLinkedTask = (postId, form, dept, assigneeId, userName, coAssigneeId) => {
        const window = DEPT_LEAD_WINDOWS[dept];
        const dueDate = addDays(form.postDate, -window.lower);
        const isVideography = dept === 'Videography/Photography';
        const assignee = assigneeId ? employees.find(e => e.id === assigneeId) : null;
        const coAssignee = coAssigneeId ? employees.find(e => e.id === coAssigneeId) : null;
        return {
            id: `TASK${Date.now()}_${dept.replace(/[^a-z]/gi,'')}`,
            title: `[${dept}] ${form.title}`,
            description: `${form.caption || ''}\n\nClient: ${form.client_id || 'N/A'}\nPlatform: ${form.platform}\nPost date: ${form.postDate}`,
            assignedTo: assigneeId || null,
            assigneeName: assignee?.name || '',
            assignedTo2: coAssigneeId || null,
            assigneeName2: coAssignee?.name || '',
            department: dept,
            sourceDept: deptName,
            assignedBy: userName,
            priority: 'Medium',
            projectId: 'General',
            dueDate,
            status: 'New',
            calendar_id: postId,
            createdAt: new Date().toISOString().split('T')[0],
            shootApprovalStatus: isVideography ? 'pending' : null,
            rescheduleRequest: null,
            isDelayed: false,
            delayCount: 0,
            delayHistory: [],
        };
    };

    /**
     * Reconcile linked tasks when a calendar entry is edited.
     */
    const reconcileCalendarEntry = (postId, oldForm, newForm) => {
        if (newForm.status !== 'Scheduled') {
            const toCancel = tasks.filter(t => t.calendar_id === postId && t.status !== 'Completed' && t.status !== 'Blocked');
            if (toCancel.length === 0) return { tasks: tasks, notifications: [] };
            const now = new Date().toISOString();
            const notifs = [];
            toCancel.forEach(t => {
                if (t.assignedTo) {
                    notifs.push({
                        id: `NTF${Date.now()}_cancel_${t.id}`,
                        userId: t.assignedTo,
                        message: `❌ Content requirement cancelled: "${t.title}" (post no longer scheduled)`,
                        type: 'info',
                        timestamp: now,
                        read: false,
                    });
                }
                if (t.assignedTo2) {
                    notifs.push({
                        id: `NTF${Date.now()}_cancel_co_${t.id}`,
                        userId: t.assignedTo2,
                        message: `❌ Content requirement cancelled: "${t.title}" (post no longer scheduled)`,
                        type: 'info',
                        timestamp: now,
                        read: false,
                    });
                }
            });
            return {
                tasks: tasks.map(t => t.calendar_id === postId && t.status !== 'Completed' && t.status !== 'Blocked' ? { ...t, status: 'Blocked' } : t),
                notifications: notifs,
            };
        }

        const oldSelected = oldForm ? getSelectedDepts(oldForm) : [];
        const newSelected = getSelectedDepts(newForm);
        const now = new Date().toISOString();
        const resultTasks = [...tasks];
        const resultNotifs = [];

        for (const dept of newSelected) {
            const assigneeId = getAssigneeForForm(newForm, dept);
            const window = DEPT_LEAD_WINDOWS[dept];
            const newDueDate = addDays(newForm.postDate, -window.lower);
            const existing = tasks.find(t => t.calendar_id === postId && t.department === dept);

            if (!existing) {
                if (assigneeId) {
                    const info = getWorkloadInfo(tasks, assigneeId, newDueDate, dept, 'Medium');
                    if (!info.canAssign) {
                        toast.error(`${dept}: ${info.reason}. Task not created.`);
                        continue;
                    }
                }
                const coAssigneeId = dept === 'Videography/Photography' && newForm.needsBothRoles ? getCoAssigneeForForm(newForm) : '';
                if (coAssigneeId) {
                    const coInfo = getWorkloadInfo(tasks, coAssigneeId, newDueDate, dept, 'Medium');
                    if (!coInfo.canAssign) {
                        toast.error(`${dept} co-assignee: ${coInfo.reason}. Task not created.`);
                        continue;
                    }
                }
                const task = createLinkedTask(postId, newForm, dept, assigneeId, user.name, coAssigneeId);
                resultTasks.push(task);
                const toNotify = assigneeId
                    ? [employees.find(e => e.id === assigneeId)].filter(Boolean)
                    : employees.filter(e => e.department?.includes(dept));
                toNotify.forEach(emp => {
                    resultNotifs.push({
                        id: `NTF${Date.now()}_new_${dept}_${emp.id}`,
                        userId: emp.id,
                        message: `📅 New content task: "${newForm.title}" — due ${task.dueDate} (${dept})`,
                        type: 'assignment',
                        timestamp: now,
                        read: false,
                    });
                });
                if (coAssigneeId) {
                    const coEmp = employees.find(e => e.id === coAssigneeId);
                    if (coEmp) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_new_co_${coEmp.id}_${dept}`,
                            userId: coEmp.id,
                            message: `📅 You are co-assigned to a content task: "${newForm.title}" — due ${task.dueDate} (${dept})`,
                            type: 'assignment',
                            timestamp: now,
                            read: false,
                        });
                    }
                }
            } else {
                let changed = false;
                const updates = {};

                if (assigneeId && assigneeId !== existing.assignedTo) {
                    updates.assignedTo = assigneeId;
                    const newEmp = employees.find(e => e.id === assigneeId);
                    if (newEmp) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_reassign_${dept}_to`,
                            userId: assigneeId,
                            message: `📌 Task reassigned to you: "${existing.title}" — due ${newDueDate} (${dept})`,
                            type: 'assignment',
                            timestamp: now,
                            read: false,
                        });
                    }
                    if (existing.assignedTo) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_reassign_${dept}_from`,
                            userId: existing.assignedTo,
                            message: `Task "${existing.title}" reassigned from you to ${newEmp?.name || 'another team member'}`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    }
                    changed = true;
                }

                if (newDueDate !== existing.dueDate) {
                    updates.dueDate = newDueDate;
                    if (existing.assignedTo) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_dated_${dept}`,
                            userId: existing.assignedTo,
                            message: `📅 Deadline changed for "${existing.title}": now due ${newDueDate} (was ${existing.dueDate})`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    }
                    if (existing.assignedTo2) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_dated_co_${dept}`,
                            userId: existing.assignedTo2,
                            message: `📅 Deadline changed for "${existing.title}": now due ${newDueDate} (was ${existing.dueDate})`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    }
                    changed = true;
                }

                if (changed) {
                    const idx = resultTasks.findIndex(t => t.id === existing.id);
                    if (idx !== -1) resultTasks[idx] = { ...resultTasks[idx], ...updates };
                }
            }
        }

        for (const dept of oldSelected) {
            if (!newSelected.includes(dept)) {
                const existing = tasks.find(t => t.calendar_id === postId && t.department === dept);
                if (existing && existing.status !== 'Completed' && existing.status !== 'Blocked') {
                    const idx = resultTasks.findIndex(t => t.id === existing.id);
                    if (idx !== -1) resultTasks[idx] = { ...resultTasks[idx], status: 'Blocked' };
                    if (existing.assignedTo) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_removed_${dept}`,
                            userId: existing.assignedTo,
                            message: `❌ Content requirement cancelled: "${existing.title}" (${dept} no longer needed)`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    }
                    if (existing.assignedTo2) {
                        resultNotifs.push({
                            id: `NTF${Date.now()}_removed_co_${dept}`,
                            userId: existing.assignedTo2,
                            message: `❌ Content requirement cancelled: "${existing.title}" (${dept} no longer needed)`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    }
                }
            }
        }

        return { tasks: resultTasks, notifications: resultNotifs };
    };

    const handleSavePost = () => {
        if (!postForm.title) { toast.error('Post title is required.'); return; }
        const selectedDepts = getSelectedDepts(postForm);
        const isFinalizing = postForm.status === 'Scheduled';
        const isEdit = !!editingPost;
        const isManager = user.role === 'Super Admin' || user.role === 'Manager';
        const isDeptMember = user.department?.includes(deptName);

        // ── Permission check: department members or managers can finalize ──
        if (isFinalizing && !isDeptMember && !isManager) {
            toast.error('Only department members or managers can finalize calendar entries.');
            return;
        }

        // ── Workload cap check before save ──
        if (isFinalizing) {
            for (const dept of selectedDepts) {
                const assigneeId = getAssigneeForForm(postForm, dept);
                if (assigneeId) {
                    const window = DEPT_LEAD_WINDOWS[dept];
                    const dueDate = addDays(postForm.postDate, -window.lower);
                    const info = getWorkloadInfo(tasks, assigneeId, dueDate, dept, 'Medium');
                    if (!info.canAssign) {
                        toast.error(`${dept}: ${info.reason}`);
                        return;
                    }
                }
                if (dept === 'Videography/Photography' && postForm.needsBothRoles) {
                    const coId = getCoAssigneeForForm(postForm);
                    if (coId) {
                        const window = DEPT_LEAD_WINDOWS[dept];
                        const dueDate = addDays(postForm.postDate, -window.lower);
                        const info = getWorkloadInfo(tasks, coId, dueDate, dept, 'Medium');
                        if (!info.canAssign) {
                            toast.error(`${dept} co-assignee: ${info.reason}`);
                            return;
                        }
                    }
                }
            }
        }

        if (isEdit) {
            // ── Reconciliation: auto-sync linked tasks ──
            const oldPost = editingPost;
            const reconcileResult = reconcileCalendarEntry(editingPost.id, oldPost, postForm);
            const updated = smmCalendar.map(p => p.id === editingPost.id ? { ...p, ...postForm } : p);
            updateState({
                smmCalendar: updated,
                tasks: reconcileResult.tasks,
                notifications: [...notifications, ...reconcileResult.notifications],
            });
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

            if (isFinalizing) {
                const now = new Date().toISOString();
                const newTasks = [];
                const newNotifs = [];

                selectedDepts.forEach(dept => {
                    const assigneeId = getAssigneeForForm(postForm, dept);
                    const coAssigneeId = dept === 'Videography/Photography' && postForm.needsBothRoles ? getCoAssigneeForForm(postForm) : '';
                    const task = createLinkedTask(newPost.id, postForm, dept, assigneeId, user.name, coAssigneeId);
                    newTasks.push(task);

                    const toNotify = assigneeId
                        ? [employees.find(e => e.id === assigneeId)].filter(Boolean)
                        : employees.filter(e => e.department?.includes(dept));

                    toNotify.forEach(emp => {
                        newNotifs.push({
                            id: `NTF${Date.now()}_${emp.id}_${dept}`,
                            userId: emp.id,
                            message: `📅 New content task from ${deptName}: "${postForm.title}" — due ${task.dueDate} (${dept})`,
                            type: 'assignment',
                            timestamp: now,
                            read: false,
                        });
                    });

                    if (coAssigneeId) {
                        const coEmp = employees.find(e => e.id === coAssigneeId);
                        if (coEmp) {
                            newNotifs.push({
                                id: `NTF${Date.now()}_co_${coEmp.id}_${dept}`,
                                userId: coEmp.id,
                                message: `📅 You are co-assigned to a content task from ${deptName}: "${postForm.title}" — due ${task.dueDate} (${dept})`,
                                type: 'assignment',
                                timestamp: now,
                                read: false,
                            });
                        }
                    }
                });

                updateState({ tasks: [...tasks, ...newTasks] });
                if (newNotifs.length) updateState({ notifications: [...notifications, ...newNotifs] });
            } else if (selectedDepts.length > 0) {
                // Simple notification for non-finalized posts
                const now = new Date().toISOString();
                const newNotifs = [];
                selectedDepts.forEach(dept => {
                    const deptMembers = employees.filter(e => e.department?.includes(dept));
                    deptMembers.forEach(emp => {
                        newNotifs.push({
                            id: `NTF${Date.now()}_${emp.id}_${dept}`,
                            userId: emp.id,
                            message: `📅 New draft content from ${deptName}: "${postForm.title}" on ${postForm.postDate} (${dept})`,
                            type: 'info',
                            timestamp: now,
                            read: false,
                        });
                    });
                });
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
    const isVideographyTarget = taskForm.targetDept === 'Videography/Photography';
    const targetDeptEmployees = employees.filter(e =>
        e.department?.includes(taskForm.targetDept) &&
        (!isVideographyTarget || !crossDeptSubType || e.subType === crossDeptSubType)
    );

    const handleAssignTask = () => {
        if (!taskForm.title || !taskForm.targetDept) {
            toast.error('Task title and target department are required.');
            return;
        }

        const dueDate = taskForm.dueDate || '';
        const isCreativeDept = ['Video Editors', 'Graphic Designers', 'Videography/Photography'].includes(taskForm.targetDept);
        const coAssigneeId = isVideographyTarget && crossDeptNeedsBoth ? crossDeptCoAssignee : '';

        // ── Workload cap check ──
        if (taskForm.assignedTo && dueDate && isCreativeDept) {
            const info = getWorkloadInfo(tasks, taskForm.assignedTo, dueDate, taskForm.targetDept, taskForm.priority);
            if (!info.canAssign) {
                toast.error(info.reason);
                return;
            }
        }
        if (coAssigneeId && dueDate && isCreativeDept) {
            const coInfo = getWorkloadInfo(tasks, coAssigneeId, dueDate, taskForm.targetDept, taskForm.priority);
            if (!coInfo.canAssign) {
                toast.error(`Co-assignee: ${coInfo.reason}`);
                return;
            }
        }

        const coAssignee = coAssigneeId ? employees.find(e => e.id === coAssigneeId) : null;
        const newTask = {
            id: `TASK${Date.now()}`,
            title: taskForm.title,
            description: taskForm.description,
            assignedTo: taskForm.assignedTo || null,
            assignedTo2: coAssigneeId || null,
            assigneeName2: coAssignee?.name || '',
            department: taskForm.targetDept,
            sourceDept: deptName,
            assignedBy: user.id,
            priority: taskForm.priority,
            projectId: 'General',
            dueDate,
            scheduledDate: null,
            status: 'New',
            createdAt: new Date().toISOString().split('T')[0],
            shootApprovalStatus: taskForm.targetDept === 'Videography/Photography' ? 'pending' : null,
            rescheduleRequest: null,
            isDelayed: false,
            delayCount: 0,
            delayHistory: [],
        };
        updateState({ tasks: [...tasks, newTask] });

        // Notify assignee or whole target dept
        const toNotify = taskForm.assignedTo
            ? [employees.find(e => e.id === taskForm.assignedTo)].filter(Boolean)
            : employees.filter(e => e.department?.includes(taskForm.targetDept));
        const now = new Date().toISOString();
        const newNotifs = toNotify.map(emp => ({
            id: `NTF${Date.now()}_${emp.id}`,
            userId: emp.id,
            message: `📌 ${deptName} assigned you a task: "${taskForm.title}"${taskForm.dueDate ? ` — due ${taskForm.dueDate}` : ''}`,
            type: 'assignment',
            timestamp: now,
            read: false,
        }));
        if (coAssigneeId && coAssignee) {
            newNotifs.push({
                id: `NTF${Date.now()}_co_${coAssigneeId}`,
                userId: coAssigneeId,
                message: `📌 ${deptName} co-assigned you to a task: "${taskForm.title}"${taskForm.dueDate ? ` — due ${taskForm.dueDate}` : ''}`,
                type: 'assignment',
                timestamp: now,
                read: false,
            });
        }
        if (newNotifs.length) updateState({ notifications: [...notifications, ...newNotifs] });

        toast.success(`Task "${taskForm.title}" assigned to ${taskForm.targetDept}.`);
        setShowTaskModal(false);
        setTaskForm(blankTask());
        setCrossDeptNeedsBoth(false);
        setCrossDeptCoAssignee('');
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
                                        const isDraft = post.status === 'Draft';
                                        return (
                                            <div key={post.id}
                                                className={`text-3xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                                                    isDraft
                                                        ? 'bg-slate-700/30 text-slate-500 italic border border-dashed border-slate-600/50'
                                                        : `${c.bg} ${c.text}`
                                                }`}
                                                title={`${isDraft ? '[DRAFT] ' : ''}${post.title}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDraft ? 'bg-slate-600' : ''}`} style={isDraft ? {} : { background: 'currentColor' }} />
                                                {isDraft ? <span className="text-4xs uppercase tracking-wider mr-0.5">Tentative</span> : null}
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
                            const isDraft = post.status === 'Draft';
                            return (
                                <div key={post.id} className={`glass-card rounded-xl border p-4 space-y-2 ${isDraft ? 'border-slate-700/60 opacity-70' : 'border-slate-800/80'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1">
                                            <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${isDraft ? 'bg-slate-700/30 text-slate-500 italic' : `${c.bg} ${c.text}`}`}>
                                                {isDraft ? 'Tentative Draft' : post.platform}
                                            </span>
                                            <h4 className={`font-bold text-sm ${isDraft ? 'text-slate-500' : 'text-slate-200'}`}>{post.title}</h4>
                                            {isDraft && <p className="text-3xs text-slate-600 italic">Not confirmed — no tasks assigned yet</p>}
                                            {post.caption && <p className="text-xs text-slate-400 italic">{post.caption}</p>}
                                            <p className="text-3xs text-slate-500">@ {post.postTime} · by {post.addedBy}</p>
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
                            const assignee2 = t.assignedTo2 ? employees.find(e => e.id === t.assignedTo2) : null;
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
                                        <p className="text-3xs text-slate-500">
                                            by {t.assignedBy || deptName}{assignee ? ` → ${assignee.name}` : ''}{assignee2 ? ` + ${assignee2.name}` : ''}
                                        </p>
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
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Client</label>
                            <input type="text" value={postForm.client_id} onChange={e=>setPostForm(f=>({...f,client_id:e.target.value}))}
                                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Luna Fashion" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <DatePicker label="Date" value={postForm.postDate} onChange={v => setPostForm(f => ({ ...f, postDate: v }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Time</label>
                                <input type="time" value={postForm.postTime} onChange={e => setPostForm(f => ({ ...f, postTime: e.target.value }))}
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
                            <label className="block text-xs text-slate-400 mb-2">Creative Departments Needed</label>
                            <div className="space-y-3">
                                {[
                                    { key: 'needs_video_editing', deptName: 'Video Editors', assignKey: 'assignedVideo' },
                                    { key: 'needs_graphic_design', deptName: 'Graphic Designers', assignKey: 'assignedGraphic' },
                                    { key: 'needs_videography', deptName: 'Videography/Photography', assignKey: 'assignedPhoto' },
                                ].map(({ key, deptName, assignKey }) => {
                                    const isChecked = postForm[key];
                                    const isVideography = deptName === 'Videography/Photography';
                                    const deptEmployees = employees.filter(e =>
                                        e.department?.includes(deptName) &&
                                        (!isVideography || !postForm[`${assignKey}SubType`] || e.subType === postForm[`${assignKey}SubType`])
                                    );
                                    const coAssigneeList = (isVideography && postForm.needsBothRoles)
                                        ? employees.filter(e =>
                                            e.department?.includes(deptName) &&
                                            e.id !== postForm[assignKey] &&
                                            (!postForm[`${assignKey}SubType`] || e.subType !== postForm[`${assignKey}SubType`])
                                        )
                                        : [];
                                    const window = DEPT_LEAD_WINDOWS[deptName];
                                    const dueDate = postForm.postDate ? addDays(postForm.postDate, -window.lower) : '';
                                    return (
                                        <div key={key} className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer min-w-0 shrink-0">
                                                <input type="checkbox" checked={isChecked} onChange={e=>setPostForm(f=>({...f,[key]:e.target.checked}))}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500" />
                                                {deptName}
                                            </label>
                                            {isChecked && (
                                                <>
                                                    {isVideography && (
                                                        <select value={postForm[`${assignKey}SubType`] || ''} onChange={e=>setPostForm(f=>({...f,[`${assignKey}SubType`]:e.target.value,[assignKey]:''}))}
                                                            className="glass-input p-2 rounded-lg text-xs shrink-0">
                                                            <option value="">All Roles</option>
                                                            <option value="Videographer">Videographer</option>
                                                            <option value="Content Creator">Content Creator</option>
                                                        </select>
                                                    )}
                                                    <select value={postForm[assignKey]} onChange={e=>setPostForm(f=>({...f,[assignKey]:e.target.value}))}
                                                        className="glass-input p-2 rounded-lg text-xs flex-1">
                                                        <option value="">— Auto-assign —</option>
                                                        {deptEmployees.map(e => {
                                                            const info = dueDate ? getWorkloadInfo(tasks, e.id, dueDate, deptName, 'Medium') : null;
                                                            const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                                                            return <option key={e.id} value={e.id} className={
                                                                info?.color === 'red' ? 'text-red-400' :
                                                                info?.color === 'amber' ? 'text-amber-400' : ''
                                                            }>{label}</option>;
                                                        })}
                                                    </select>
                                                    {dueDate && (
                                                        <span className="text-3xs text-slate-500 shrink-0">due {dueDate}</span>
                                                    )}
                                                </>
                                            )}
                                            {isVideography && isChecked && (
                                                <div className="flex items-center gap-2 mt-1 w-full">
                                                    <label className="flex items-center gap-1.5 text-xs text-amber-400/80 cursor-pointer shrink-0">
                                                        <input type="checkbox" checked={postForm.needsBothRoles}
                                                            onChange={e=>setPostForm(f=>({...f,needsBothRoles:e.target.checked,assignedPhotoCo:''}))}
                                                            className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                                                        Requires both roles?
                                                    </label>
                                                    {postForm.needsBothRoles && postForm[assignKey] && (
                                                        <select value={postForm.assignedPhotoCo || ''} onChange={e=>setPostForm(f=>({...f,assignedPhotoCo:e.target.value}))}
                                                            className="glass-input p-2 rounded-lg text-xs flex-1">
                                                            <option value="">— Select co-assignee —</option>
                                                            {coAssigneeList.map(e => (
                                                                <option key={e.id} value={e.id}>{e.name} ({e.subType || e.role})</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                                <select value={taskForm.targetDept} onChange={e => {setTaskForm(f => ({ ...f, targetDept: e.target.value, assignedTo: '' })); setCrossDeptSubType('');}} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {ALL_DEPARTMENTS.filter(d => d !== deptName).map(d => <option key={d}>{d}</option>)}
                                </select>
                            </div>
                            {isVideographyTarget ? (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Role Type</label>
                                    <select value={crossDeptSubType} onChange={e => {setCrossDeptSubType(e.target.value); setTaskForm(f => ({ ...f, assignedTo: '' }));}} className="w-full glass-input p-3 rounded-xl text-sm">
                                        <option value="">All Roles</option>
                                        <option value="Videographer">Videographer</option>
                                        <option value="Content Creator">Content Creator / Influencer</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
                                    <select value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                        <option value="">Whole department</option>
                                        {targetDeptEmployees.map(e => {
                                            const dueDate = taskForm.dueDate || '';
                                            const isCreativeDept = ['Video Editors', 'Graphic Designers', 'Videography/Photography'].includes(taskForm.targetDept);
                                            const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                                            const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                                            return <option key={e.id} value={e.id} className={
                                                info?.color === 'red' ? 'text-red-400' :
                                                info?.color === 'amber' ? 'text-amber-400' :
                                                ''
                                            }>{label}</option>;
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                        {isVideographyTarget && (
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
                                <select value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    <option value="">Whole department</option>
                                    {targetDeptEmployees.map(e => {
                                        const dueDate = taskForm.dueDate || '';
                                        const isCreativeDept = ['Video Editors', 'Graphic Designers', 'Videography/Photography'].includes(taskForm.targetDept);
                                        const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                                        const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                                        return <option key={e.id} value={e.id} className={
                                            info?.color === 'red' ? 'text-red-400' :
                                            info?.color === 'amber' ? 'text-amber-400' :
                                            ''
                                        }>{label}</option>;
                                    })}
                                </select>
                            </div>
                        )}
                        {isVideographyTarget && (
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-amber-400/80 cursor-pointer shrink-0">
                                    <input type="checkbox" checked={crossDeptNeedsBoth}
                                        onChange={e => { setCrossDeptNeedsBoth(e.target.checked); setCrossDeptCoAssignee(''); }}
                                        className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                                    Requires both roles?
                                </label>
                                {crossDeptNeedsBoth && taskForm.assignedTo && (
                                    <select value={crossDeptCoAssignee} onChange={e => setCrossDeptCoAssignee(e.target.value)}
                                        className="flex-1 glass-input p-2 rounded-lg text-xs">
                                        <option value="">— Select co-assignee —</option>
                                        {employees.filter(e =>
                                            e.department?.includes(taskForm.targetDept) &&
                                            e.id !== taskForm.assignedTo &&
                                            (!crossDeptSubType || e.subType !== crossDeptSubType)
                                        ).map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.subType || e.role})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="w-full glass-input p-3 rounded-xl text-sm">
                                    {['Low','Medium','High','Emergency'].map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <DatePicker label="Due Date" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({ ...f, dueDate: v }))} />
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
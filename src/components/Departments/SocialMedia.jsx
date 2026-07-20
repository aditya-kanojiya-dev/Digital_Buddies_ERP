import { useState, useMemo } from 'react';
import {
  Calendar, Plus, Download, FileText, Share2,
  Lock, ChevronLeft, ChevronRight, X, Check, Edit3,
  Trash2, Send, CalendarClock, CalendarCheck,

} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { db } from '../../data/db';
import { DatePicker, Modal, ConfirmDialog } from '../ui';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { genId, today, addDays, computeDueDate } from '../../lib/format';
import { CREATIVE_DEPTS, DEPT_TIMELINE_RULES } from '../ManagerDashboard';

// ─── helpers ───────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const PLATFORM_COLORS = {
  Instagram:  { bg: 'bg-pink-500/15',    text: 'text-pink-400',    border: 'border-pink-500/40' },
  LinkedIn:   { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/40' },
  Facebook:   { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/40' },
  YouTube:    { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/40' },
  Twitter:    { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/40' },
};

const STATUS_STYLES = {
  Scheduled: 'bg-indigo-500/15 text-indigo-400',
  Draft:     'bg-amber-500/15  text-amber-400',
  Published: 'bg-emerald-500/15 text-emerald-400',
  Cancelled: 'bg-rose-500/15  text-rose-400',
};

const DEPT_COLORS = {
  'Paid Ads':               'bg-orange-500/15 text-orange-400',
  'Social Media':           'bg-violet-500/15 text-violet-400',
  'Video Editors':          'bg-red-500/15    text-red-400',
  'Graphic Designers':      'bg-pink-500/15   text-pink-400',
  'Videography/Photography':'bg-teal-500/15   text-teal-400',
  'Developers':             'bg-blue-500/15   text-blue-400',
  'HR':                     'bg-emerald-500/15 text-emerald-400',
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

// ── Platform icon ───────────────────────────────────────────────────────────

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SocialMedia({ user, state, updateState }) {
  const toast = useToast();
  const { smmCalendar, smmQuotes, employees, tasks, notifications } = state;

  const isSocialMedia = user.department?.includes('Social Media');
  const isManager     = user.role === 'Super Admin' || user.role === 'Manager';
  const canEdit       = isManager || isSocialMedia; // SM members + admins/managers can create

  // ── Calendar nav ──────────────────────────────────────────────────────────
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // ── Modal states ──────────────────────────────────────────────────────────
  const [showPostModal,  setShowPostModal]  = useState(false);
  const [showTaskModal,  setShowTaskModal]  = useState(false);
  const [showDayModal,   setShowDayModal]   = useState(false);
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [editingPost,    setEditingPost]    = useState(null);
  const [activeTab,      setActiveTab]      = useState('calendar'); // 'calendar' | 'tasks' | 'quotes' | 'mom'
  const [selectedTask,   setSelectedTask]   = useState(null);



  // ── Lead-time windows ────────────────────────────────────────────────────
  const DEPT_LEAD_WINDOWS = {
    'Videography/Photography': { lower: 5, upper: 7 },
    'Video Editors':           { lower: 3, upper: 5 },
    'Graphic Designers':       { lower: 3, upper: 5 },
  };

  // ── Post form state ───────────────────────────────────────────────────────
  const blankPost = () => ({
    title: '', postDate: today(), postTime: '12:00', platform: 'Instagram',
    caption: '', status: 'Draft',
    client_id: '', needs_videography: false, needs_video_editing: false, needs_graphic_design: false,
    assignedVideo: '', assignedGraphic: '', assignedPhoto: '', assignedPhotoSubType: '',
    needsBothRoles: false, assignedPhotoCo: '',
  });
  const [postForm, setPostForm] = useState(blankPost());

  // ── Cross-dept task form ───────────────────────────────────────────────────
  const blankTask = () => ({
    title: '', description: '', targetDept: 'Video Editors',
    assignedTo: '', dueDate: '', scheduledDate: '', priority: 'Medium', timelineDays: '3',
  });
  const [taskForm, setTaskForm] = useState(blankTask());
  const [crossDeptSubType, setCrossDeptSubType] = useState('');
  const [crossDeptNeedsBoth, setCrossDeptNeedsBoth] = useState(false);
  const [crossDeptCoAssignee, setCrossDeptCoAssignee] = useState('');

  // Employees filter for the assignee dropdown in the cross-dept modal
  const isVideographyTarget = taskForm.targetDept === 'Videography/Photography';
  const deptEmployees = employees.filter(e =>
    e.department?.includes(taskForm.targetDept) &&
    (!isVideographyTarget || !crossDeptSubType || e.subType === crossDeptSubType)
  );
  const crossDeptCoStaff = (crossDeptNeedsBoth && isVideographyTarget && crossDeptSubType)
    ? employees.filter(e =>
        e.department?.includes(taskForm.targetDept) &&
        e.subType !== crossDeptSubType &&
        e.id !== taskForm.assignedTo
      )
    : [];

  // ── Quote / MOM form ──────────────────────────────────────────────────────
  const [quoteClient, setQuoteClient] = useState('');
  const [quoteDetails, setQuoteDetails] = useState('');
  const [quoteCost, setQuoteCost] = useState('');
  const [momClient, setMomClient] = useState('');
  const [momDate, setMomDate] = useState(today());
  const [momAttendees, setMomAttendees] = useState('');
  const [momPoints, setMomPoints] = useState('');
  const [momActionItems, setMomActionItems] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstDay     = getFirstDayOfMonth(calYear, calMonth);
  const prevMonth    = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); };
  const nextMonth    = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); };
  const goToday      = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); };

  // ponytail: pre-index by date string to avoid O(n) scan per calendar cell
  const postsByDate = useMemo(() => {
    const map = {};
    smmCalendar.forEach(p => { (map[p.postDate] ??= []).push(p); });
    return map;
  }, [smmCalendar]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (t.dueDate) (map[t.dueDate] ??= []).push(t);
      if (t.scheduledDate && t.scheduledDate !== t.dueDate) (map[t.scheduledDate] ??= []).push(t);
    });
    return map;
  }, [tasks]);

  const postsOnDay = (d) => {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return postsByDate[dateStr] || [];
  };

  const tasksOnDay = (d) => {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return tasksByDate[dateStr] || [];
  };

  // ── Post CRUD ─────────────────────────────────────────────────────────────
  const openAddPost = (dateStr) => {
    setEditingPost(null);
    setPostForm({ ...blankPost(), date: dateStr || today() });
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

  const getAssigneeForDept = (form, dept) => {
    const map = {
      'Video Editors': 'assignedVideo',
      'Graphic Designers': 'assignedGraphic',
      'Videography/Photography': 'assignedPhoto',
    };
    return form[map[dept]] || '';
  };

  const createLinkedTask = (postId, form, dept, assigneeId, coAssigneeId) => {
    const window = DEPT_LEAD_WINDOWS[dept];
    const dueDate = addDays(form.postDate, -window.lower);
    const assignee = assigneeId ? employees.find(e => e.id === assigneeId) : null;
    const coAssignee = coAssigneeId ? employees.find(e => e.id === coAssigneeId) : null;
    const isVideography = dept === 'Videography/Photography';
    return {
      id: genId('TASK') + `_${dept.replace(/[^a-z]/gi,'')}`,
      title: `[${dept}] ${form.title}`,
      description: `${form.caption || ''}\n\nClient: ${form.client_id || 'N/A'}\nPlatform: ${form.platform}\nPost date: ${form.postDate}`,
      assignedTo: assigneeId || null,
      assigneeName: assignee?.name || '',
      assignedTo2: coAssigneeId || null,
      assigneeName2: coAssignee?.name || '',
      department: dept,
      sourceDept: 'Social Media',
      assignedBy: user.id,
      priority: 'Medium',
      projectId: 'General',
      dueDate,
      scheduledDate: CREATIVE_DEPTS.includes(dept) ? form.postDate : null,
      status: 'New',
      calendar_id: postId,
      createdAt: new Date().toISOString().split('T')[0],
      pinged: 0,
      lastPingedAt: null,
      shootApprovalStatus: isVideography ? 'pending' : null,
      rescheduleRequest: null,
      isDelayed: false,
      delayCount: 0,
      delayHistory: [],
    };
  };

  const createHeadsUpNotificationDate = (postDate, dept) => {
    const window = DEPT_LEAD_WINDOWS[dept];
    return addDays(postDate, -window.upper);
  };

  const deptToAssigneeKey = {
    'Video Editors': 'assignedVideo',
    'Graphic Designers': 'assignedGraphic',
    'Videography/Photography': 'assignedPhoto',
  };

  const deptToCheckboxKey = {
    'Video Editors': 'needs_video_editing',
    'Graphic Designers': 'needs_graphic_design',
    'Videography/Photography': 'needs_videography',
  };

  /**
   * Reconcile linked tasks when a calendar entry is edited.
   * Handles dept added/removed, assignee changed, post date changed.
   * Returns { tasks, notifications } arrays to merge into state.
   */
  const reconcileCalendarEntry = (postId, oldForm, newForm) => {
    if (newForm.status !== 'Scheduled') {
      // If moved away from Scheduled, cancel all linked tasks
      const toCancel = tasks.filter(t => t.calendar_id === postId && t.status !== 'Completed' && t.status !== 'Blocked');
      if (toCancel.length === 0) return { tasks: [], notifications: [] };
      const now = new Date().toISOString();
      const notifs = [];
      toCancel.forEach(t => {
        if (t.assignedTo) {
          notifs.push({
            id: genId('NTF') + `_cancel_${t.id}`,
            userId: t.assignedTo,
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
      const assigneeId = getAssigneeForDept(newForm, dept);
      const coAssigneeId = dept === 'Videography/Photography' && newForm.needsBothRoles ? newForm.assignedPhotoCo || '' : '';
      const window = DEPT_LEAD_WINDOWS[dept];
      const newDueDate = addDays(newForm.postDate, -window.lower);
      const existing = tasks.find(t => t.calendar_id === postId && t.department === dept);

      if (!existing) {
        // ── Department newly added — create task ──
        if (assigneeId) {
          const info = getWorkloadInfo(tasks, assigneeId, newDueDate, dept, 'Medium');
          if (!info.canAssign) {
            toast.error(`${dept}: ${info.reason}. Task not created.`);
            continue;
          }
        }
        const task = createLinkedTask(postId, newForm, dept, assigneeId, coAssigneeId);
        resultTasks.push(task);
        const toNotify = assigneeId
          ? [employees.find(e => e.id === assigneeId)].filter(Boolean)
          : employees.filter(e => e.department?.includes(dept));
        toNotify.forEach(emp => {
          resultNotifs.push({
            id: genId('NTF') + `_new_${dept}_${emp.id}`,
            userId: emp.id,
            message: `📅 New content task: "${newForm.title}" — due ${task.dueDate} (${dept})`,
            type: 'assignment',
            timestamp: now,
            read: false,
          });
        });
      } else {
        // ── Existing department — check what changed ──
        let changed = false;
        const updates = {};

        // Assignee changed?
        const oldAssignee = getAssigneeForDept(oldForm || newForm, dept);
        if (assigneeId && assigneeId !== existing.assignedTo) {
          updates.assignedTo = assigneeId;
          updates.assigneeName = employees.find(e => e.id === assigneeId)?.name || '';
          // Notify new assignee
          const newEmp = employees.find(e => e.id === assigneeId);
          if (newEmp) {
            resultNotifs.push({
              id: genId('NTF') + `_reassign_${dept}_to`,
              userId: assigneeId,
              message: `📌 Task reassigned to you: "${existing.title}" — due ${newDueDate} (${dept})`,
              type: 'assignment',
              timestamp: now,
              read: false,
            });
          }
          // Notify old assignee
          if (existing.assignedTo) {
            resultNotifs.push({
              id: genId('NTF') + `_reassign_${dept}_from`,
              userId: existing.assignedTo,
              message: `Task "${existing.title}" reassigned from you to ${newEmp?.name || 'another team member'}`,
              type: 'info',
              timestamp: now,
              read: false,
            });
          }
          changed = true;
        }

        // Post date changed -> update due date
        if (newDueDate !== existing.dueDate) {
          updates.dueDate = newDueDate;
          if (existing.assignedTo) {
            resultNotifs.push({
              id: genId('NTF') + `_dated_${dept}`,
              userId: existing.assignedTo,
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
          if (idx !== -1) {
            resultTasks[idx] = { ...resultTasks[idx], ...updates };
          }
        }
      }
    }

    // ── Departments unchecked — cancel their linked tasks ──
    for (const dept of oldSelected) {
      if (!newSelected.includes(dept)) {
        const existing = tasks.find(t => t.calendar_id === postId && t.department === dept);
        if (existing && existing.status !== 'Completed' && existing.status !== 'Blocked') {
          const idx = resultTasks.findIndex(t => t.id === existing.id);
          if (idx !== -1) resultTasks[idx] = { ...resultTasks[idx], status: 'Blocked' };
          if (existing.assignedTo) {
            resultNotifs.push({
              id: genId('NTF') + `_removed_${dept}`,
              userId: existing.assignedTo,
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

  const handleSavePost = async () => {
    if (!postForm.title) { toast.error('Post title is required.'); return; }

    const selectedDepts = getSelectedDepts(postForm);
    const isFinalizing = postForm.status === 'Scheduled';
    const isEdit = !!editingPost;
    const oldPost = isEdit ? editingPost : null;

    // ── Permission check: only Social Media members can finalize ──
    if (isFinalizing && !isSocialMedia && !isManager) {
      toast.error('Only Social Media team members can finalize calendar entries.');
      return;
    }

    // ── Workload cap check before save (new assignments only) ──
    if (isFinalizing) {
      for (const dept of selectedDepts) {
        const assigneeId = getAssigneeForDept(postForm, dept);
        if (!assigneeId) continue;
        const window = DEPT_LEAD_WINDOWS[dept];
        const dueDate = addDays(postForm.postDate, -window.lower);
        const existing = tasks.find(t => t.calendar_id === (editingPost?.id || '') && t.department === dept);
        // Only check if this is a NEW assignment, not a re-save of the same
        if (!existing || existing.assignedTo !== assigneeId) {
          const info = getWorkloadInfo(tasks, assigneeId, dueDate, dept, 'Medium');
          if (!info.canAssign) {
            toast.error(`${dept}: ${info.reason}`);
            return;
          }
        }
      }
    }

    if (isEdit) {
      // ── Run reconciliation cascade ──
      const reconcile = reconcileCalendarEntry(editingPost.id, oldPost, postForm);
      updateState({
        smmCalendar: smmCalendar.map(p => p.id === editingPost.id ? { ...p, ...postForm } : p),
        tasks: reconcile.tasks,
        notifications: [...notifications, ...reconcile.notifications],
      });

      // ── Persist task changes individually to bypass RLS bulk-upsert issue ──
      //     (non-manager employees can't bulk-upsert tasks they don't own)
      reconcile.tasks.forEach(t => {
        const ot = tasks.find(x => x.id === t.id);
        if (!ot) {
          db.addTask(t).catch(err => console.warn('[SocialMedia] Failed to add task:', err));
        } else if (Object.keys(t).some(k => t[k] !== ot[k])) {
          db.updateTask(t.id, t).catch(err => console.warn('[SocialMedia] Failed to update task:', err));
        }
      });

      toast.success('Post updated on calendar.');
    } else {
      const newPost = {
        id: genId('POST'),
        ...postForm,
        addedBy: user.name,
        addedById: user.id,
        createdAt: new Date().toISOString(),
      };
      const stateUpdates = { smmCalendar: [...smmCalendar, newPost] };

      // ── Create linked tasks + notifications for Scheduled (final calendar) ──
      if (isFinalizing) {
        const now = new Date().toISOString();
        const newTasks = [];
        const newNotifs = [];

        selectedDepts.forEach(dept => {
          const assigneeId = getAssigneeForDept(postForm, dept);
          const coAssigneeId = dept === 'Videography/Photography' && postForm.needsBothRoles ? postForm.assignedPhotoCo || '' : '';
          const task = createLinkedTask(newPost.id, postForm, dept, assigneeId, coAssigneeId);
          newTasks.push(task);

          const toNotify = assigneeId
            ? [employees.find(e => e.id === assigneeId)].filter(Boolean)
            : employees.filter(e => e.department?.includes(dept));

          toNotify.forEach(emp => {
            newNotifs.push({
              id: genId('NTF') + `_${emp.id}_${dept}`,
              userId: emp.id,
              message: `📅 New content task from Social Media: "${postForm.title}" — due ${task.dueDate} (${dept})`,
              type: 'assignment',
              timestamp: now,
              read: false,
            });
          });
        });

        stateUpdates.tasks = [...tasks, ...newTasks];
        stateUpdates.notifications = [...notifications, ...newNotifs];
        // Persist new tasks individually (bypasses RLS bulk-upsert issue)
        newTasks.forEach(t => db.addTask(t).catch(err => console.warn('[SocialMedia] Failed to add task:', err)));
      }

      // ── Simple notification for non-finalized posts ──
      if (!isFinalizing && selectedDepts.length > 0) {
        const now = new Date().toISOString();
        const newNotifs = [];
        selectedDepts.forEach(dept => {
          const deptMembers = employees.filter(e => e.department?.includes(dept));
          deptMembers.forEach(emp => {
            newNotifs.push({
              id: genId('NTF') + `_${emp.id}_${dept}`,
              userId: emp.id,
              message: `📅 New draft content from Social Media: "${postForm.title}" on ${postForm.postDate} (${dept})`,
              type: 'info',
              timestamp: now,
              read: false,
            });
          });
        });
        stateUpdates.notifications = [...notifications, ...newNotifs];
      }

      updateState(stateUpdates);
      toast.success(`"${postForm.title}" added to calendar.`);
    }
    setShowPostModal(false);
    setEditingPost(null);
    setPostForm(blankPost());
  };

  const handleDeletePost = (postId) => {
    setConfirmState({
      open: true,
      message: 'Delete this calendar entry?',
      onConfirm: () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        db.deleteCalendarPost(postId).catch(err => console.error(err));
        updateState({ smmCalendar: smmCalendar.filter(p => p.id !== postId) });
        toast.success('Entry removed from calendar.');
        setShowDayModal(false);
      }
    });
  };

  const handleStatusChange = (postId, newStatus) => {
    const updated = smmCalendar.map(p => p.id === postId ? { ...p, status: newStatus } : p);
    updateState({ smmCalendar: updated });
  };

  // ── Reschedule request handlers ─────────────────────────────────────────
  const canHandleReschedule = (task) =>
    task.rescheduleRequest
    && (task.assignedBy === user.id || isManager);

  const handleAcceptReschedule = (taskId) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t || !t.rescheduleRequest) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const { proposedDate, requestedByName } = t.rescheduleRequest;

    const updatedTasks = tasks.map(x =>
      x.id === taskId ? {
        ...x,
        dueDate: proposedDate,
        shootApprovalStatus: 'pending',
        rescheduleRequest: null,
      } : x
    );

    const notifs = [];
    if (t.assignedTo) {
      notifs.push({
        id: genId('NTF'),
        userId: t.assignedTo,
        message: `✅ ${user.name} accepted the reschedule for "${t.title}". New due date: ${proposedDate}. Please approve the shoot date.`,
        type: 'info',
        timestamp: now,
        read: false,
      });
    }

    updateState({
      tasks: updatedTasks,
      ...(notifs.length ? { notifications: [...notifications, ...notifs] } : {}),
    });
    toast.success(`Reschedule accepted. Due date updated to ${proposedDate}.`);
  };

  const handleRejectReschedule = (taskId) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t || !t.rescheduleRequest) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedTasks = tasks.map(x =>
      x.id === taskId ? {
        ...x,
        shootApprovalStatus: 'pending',
        rescheduleRequest: null,
      } : x
    );

    const notifs = [];
    if (t.assignedTo) {
      notifs.push({
        id: genId('NTF'),
        userId: t.assignedTo,
        message: `❌ ${user.name} rejected the reschedule request for "${t.title}". Original date ${t.dueDate} stands. Please coordinate with Social Media.`,
        type: 'info',
        timestamp: now,
        read: false,
      });
    }

    updateState({
      tasks: updatedTasks,
      ...(notifs.length ? { notifications: [...notifications, ...notifs] } : {}),
    });
    toast.success('Reschedule request rejected. Original date stands.');
  };

  // ── Cross-dept task assign ────────────────────────────────────────────────
  const rule = DEPT_TIMELINE_RULES[taskForm.targetDept] || {};
  const isCreativeDept = CREATIVE_DEPTS.includes(taskForm.targetDept);

  const handleAssignTask = () => {
    if (!taskForm.title || !taskForm.targetDept) { toast.error('Task title and target department are required.'); return; }

    const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });

    // ── Workload cap check ──
    if (taskForm.assignedTo && dueDate && CREATIVE_DEPTS.includes(taskForm.targetDept)) {
      const info = getWorkloadInfo(tasks, taskForm.assignedTo, dueDate, taskForm.targetDept, taskForm.priority);
      if (!info.canAssign) {
        toast.error(info.reason);
        return;
      }
      if (info.reason && !info.reason.startsWith('⚠️')) {
        toast.warning(info.reason);
      }
    }

    if (crossDeptNeedsBoth && crossDeptCoAssignee && dueDate && CREATIVE_DEPTS.includes(taskForm.targetDept)) {
      const coInfo = getWorkloadInfo(tasks, crossDeptCoAssignee, dueDate, taskForm.targetDept, taskForm.priority);
      if (!coInfo.canAssign) {
        toast.error(`Co-assignee: ${coInfo.reason}`);
        return;
      }
    }

    const isCreative = CREATIVE_DEPTS.includes(taskForm.targetDept);
    const isVideography = taskForm.targetDept === 'Videography/Photography';
    const assignee = taskForm.assignedTo ? employees.find(e => e.id === taskForm.assignedTo) : null;
    const coAssignee = crossDeptNeedsBoth && crossDeptCoAssignee ? employees.find(e => e.id === crossDeptCoAssignee) : null;
    const newTask = {
      id: genId('TASK'),
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.assignedTo || null,
      assigneeName: assignee?.name || '',
      assignedTo2: coAssignee?.id || null,
      assigneeName2: coAssignee?.name || '',
      department: taskForm.targetDept,
      sourceDept: 'Social Media',
      assignedBy: user.id,
      priority: taskForm.priority,
      projectId: 'General',
      dueDate,
      scheduledDate: isCreative ? taskForm.scheduledDate || null : null,
      status: 'New',
      createdAt: new Date().toISOString().split('T')[0],
      pinged: 0,
      lastPingedAt: null,
      shootApprovalStatus: isVideography ? 'pending' : null,
      rescheduleRequest: null,
      isDelayed: false,
      delayCount: 0,
      delayHistory: [],
    };

    // Notify assignee or whole dept
    const toNotify = taskForm.assignedTo
      ? [employees.find(e => e.id === taskForm.assignedTo)].filter(Boolean)
      : employees.filter(e => e.department?.includes(taskForm.targetDept));
    if (coAssignee) toNotify.push(coAssignee);
    const now = new Date().toISOString();
    const newNotifs = toNotify.map(emp => ({
      id: genId('NTF') + `_${emp.id}`,
      userId: emp.id,
      message: `📌 Social Media assigned you a task: "${taskForm.title}"${dueDate ? ` — due ${dueDate}` : ''}`,
      type: 'assignment',
      timestamp: now,
      read: false,
    }));

    // Batch into single updateState to avoid 2 separate Supabase persist calls
    updateState({
      tasks: [...tasks, newTask],
      ...(newNotifs.length ? { notifications: [...notifications, ...newNotifs] } : {}),
    });
    db.addTask(newTask).catch(err => console.warn('[SocialMedia] Failed to add task:', err));

    toast.success(`Task "${taskForm.title}" assigned to ${taskForm.targetDept}.`);
    setShowTaskModal(false);
    setTaskForm(blankTask());
    setCrossDeptNeedsBoth(false);
    setCrossDeptCoAssignee('');
  };

  // ── Quote ─────────────────────────────────────────────────────────────────
  const handleCreateQuote = (e) => {
    e.preventDefault();
    if (!quoteClient || !quoteCost) return;
    const newQuote = {
      id: genId('QT'),
      clientName: quoteClient,
      details: quoteDetails,
      cost: parseFloat(quoteCost),
      date: today(),
      createdBy: user.name,
    };
    updateState({ smmQuotes: [...smmQuotes, newQuote] });
    const blob = new Blob([`
========================================
SOCIAL MEDIA MANAGEMENT QUOTATION
========================================
Client Name: ${newQuote.clientName}
Quotation Date: ${newQuote.date}
Proposal Reference: ${newQuote.id}

Services Description:
${newQuote.details || 'General social media management, brand design, and reels compilation.'}

Total Proposed Cost: ₹${newQuote.cost.toLocaleString()} per month
Tax / GST: Inclusive

Terms:
1. 50% advance at start of campaign.
2. Invoices generated on 1st of every month.

Prepared by: ${user.name} — Social Media Department
========================================
`], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `SMM_Quotation_${newQuote.clientName.replace(/\s+/g,'_')}.txt`; a.click();
    toast.success('Quotation generated and downloaded.');
    setQuoteClient(''); setQuoteDetails(''); setQuoteCost('');
  };

  // ── MOM ───────────────────────────────────────────────────────────────────
  const handleCreateMom = (e) => {
    e.preventDefault();
    if (!momClient || !momPoints) return;
    const newMom = { id: genId('MOM'), clientName: momClient, date: momDate, attendees: momAttendees, points: momPoints, actionItems: momActionItems, createdBy: user.name };
    updateState({ moms: [...(state.moms||[]), newMom] });
    const blob = new Blob([`
========================================
MINUTES OF MEETING (MOM)
========================================
Client Name: ${newMom.clientName}
Meeting Date: ${newMom.date}
Attendees: ${newMom.attendees || 'SMM Team & Client'}

Discussion Points:
${newMom.points}

Action Items:
${newMom.actionItems || 'No specific action items assigned.'}

Generated by: ${user.name} — Social Media Department
========================================
`], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `MOM_${newMom.clientName.replace(/\s+/g,'_')}_${newMom.date}.txt`; a.click();
    toast.success('MOM compiled and downloaded.');
    setMomClient(''); setMomAttendees(''); setMomPoints(''); setMomActionItems('');
  };

  // ── Task status change (for tasks SM assigned) ────────────────────────────
  const handleTaskStatusChange = (taskId, nextStatus) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    updateState({
      tasks: tasks.map(x => x.id === taskId ? { ...x, status: nextStatus } : x),
      notifications: t.assignedTo && t.assignedTo !== user.id ? [{
        id: genId('NTF'),
        userId: t.assignedTo,
        message: `${user.name} moved "${t.title}" from "${t.status}" to "${nextStatus}".`,
        type: 'info',
        timestamp: now,
        read: false,
      }, ...(notifications || [])] : notifications || [],
    });
    toast.success(`Task status updated to ${nextStatus}.`);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const myAssignedTasks = tasks.filter(t => t.sourceDept === 'Social Media');
  const todayPosts = smmCalendar.filter(p => p.postDate === today());

  // ══ Render ════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Social Media</h1>
          <p className="text-sm text-slate-400 mt-0.5">Content calendar, cross-dept tasks, and client tools</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => openAddPost(today())} className="bg-neon-gradient px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg">
              <Plus className="w-4 h-4" /> Add Post
            </button>
            <button onClick={() => setShowTaskModal(true)} className="bg-slate-800 hover:bg-slate-700 border border-violet-500/20 px-4 py-2 rounded-xl text-violet-300 text-xs font-bold flex items-center gap-2 transition">
              <Send className="w-4 h-4" /> Assign to Dept
            </button>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Posts",    val: todayPosts.length,                              color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Scheduled',        val: smmCalendar.filter(p=>p.status==='Scheduled').length, color:'text-indigo-400', bg:'bg-indigo-500/10' },
          { label: 'Published',        val: smmCalendar.filter(p=>p.status==='Published').length, color:'text-emerald-400',bg:'bg-emerald-500/10'},
          { label: 'Cross-Dept Tasks', val: myAssignedTasks.length,                         color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map(s => (
          <div key={s.label} className={`glass-card p-4 rounded-2xl flex items-center gap-4`}>
            <div className={`p-2.5 rounded-xl ${s.bg}`}>
              <Calendar className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl w-fit border border-slate-800">
        {[
          { id: 'calendar', label: 'Live Calendar' },
          { id: 'tasks',    label: 'Dept Tasks' },
          { id: 'quotes',   label: 'Quotations' },
          { id: 'mom',      label: 'MOMs' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ CALENDAR TAB ══════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="glass-panel rounded-2xl overflow-x-auto border border-violet-500/10">
          {/* Calendar header */}
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
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {Object.entries(PLATFORM_COLORS).slice(0,4).map(([pl, c]) => (
                <span key={pl} className={`flex items-center gap-1 ${c.text}`}>
                  <span className="w-2 h-2 rounded-full" style={{background:'currentColor'}} />
                  {pl}
                </span>
              ))}
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="min-h-[100px] border-r border-b border-slate-800/50 bg-slate-900/20" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayPosts = postsOnDay(day);
              const dayTasks = tasksOnDay(day);
              const isToday  = dateStr === today();

              return (
                <div
                  key={day}
                  onClick={() => { setSelectedDay({ day, dateStr, posts: dayPosts, tasks: dayTasks }); setShowDayModal(true); }}
                  className={`min-h-[100px] border-r border-b border-slate-800/50 p-1.5 cursor-pointer transition group relative
                    ${isToday ? 'bg-violet-950/30' : 'hover:bg-slate-800/20'}`}
                >
                  {/* Day number */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                    isToday ? 'bg-violet-600 text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {day}
                  </div>

                  {/* Post chips */}
                  <div className="space-y-0.5">
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
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDraft ? 'bg-slate-600' : ''}`} style={isDraft ? {} : {background:'currentColor'}} />
                          {isDraft ? <span className="text-4xs uppercase tracking-wider mr-0.5">Tentative</span> : null}
                          {post.title}
                        </div>
                      );
                    })}
                    {dayTasks.slice(0, 2).map(t => (
                      <div key={t.id}
                        className="text-3xs px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 truncate"
                        title={t.title}
                      >
                        📌 {t.title}
                      </div>
                    ))}
                    {(dayPosts.length + dayTasks.length) > 4 && (
                      <div className="text-3xs text-slate-500 pl-1">+{dayPosts.length + dayTasks.length - 4} more</div>
                    )}
                  </div>

                  {/* Quick add button on hover */}
                  {canEdit && (
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
      )}

      {/* ══ DEPT TASKS TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-400" />
              Tasks Assigned by Social Media
            </h2>
            {canEdit && (
              <button onClick={() => setShowTaskModal(true)} className="bg-neon-gradient px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Assign Task
              </button>
            )}
          </div>

          {myAssignedTasks.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-slate-500">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No cross-department tasks assigned yet.</p>
              {canEdit && <button onClick={() => setShowTaskModal(true)} className="mt-4 text-violet-400 text-sm">Assign your first task →</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAssignedTasks.map(t => {
                const assignee = employees.find(e => e.id === t.assignedTo);
                const dc = DEPT_COLORS[t.department] || 'bg-slate-500/15 text-slate-400';
                const isOverdue = t.dueDate && t.dueDate < today() && t.status !== 'Completed';
                const hasReschedule = t.rescheduleRequest;
                return (
                  <div key={t.id} className={`glass-card p-4 rounded-xl border ${isOverdue ? 'border-rose-500/30' : hasReschedule ? 'border-amber-500/30' : 'border-slate-800'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${dc}`}>{t.department}</span>
                        <h4 className="font-bold text-sm text-slate-200">{t.title}</h4>
                      </div>
                      <span className={`text-3xs px-2 py-0.5 rounded-full shrink-0 ${
                        t.priority === 'Emergency' ? 'bg-red-600/20 text-red-400' :
                        t.priority === 'High' ? 'bg-rose-500/15 text-rose-400' :
                        t.priority === 'Low'  ? 'bg-slate-600/40 text-slate-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{t.priority}</span>
                    </div>

                    {/* Reschedule request banner */}
                    {hasReschedule && (
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 mb-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-amber-300">Reschedule Requested</span>
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-500">New date:</span>{' '}
                          <span className="font-semibold text-amber-300">{t.rescheduleRequest.proposedDate}</span>
                        </div>
                        <p className="text-xs text-slate-400 italic">"{t.rescheduleRequest.reason}"</p>
                        <p className="text-3xs text-slate-500">by {t.rescheduleRequest.requestedByName}</p>
                        {canHandleReschedule(t) && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => handleAcceptReschedule(t.id)}
                              className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-3xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1">
                              <CalendarCheck className="w-3 h-3" /> Accept New Date
                            </button>
                            <button onClick={() => handleRejectReschedule(t.id)}
                              className="flex-1 bg-rose-600/80 hover:bg-rose-500/80 text-white text-3xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1">
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {t.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center justify-between text-3xs text-slate-500">
                      <span>{assignee ? `→ ${assignee.name}` : `→ ${t.department} team`}</span>
                      <span className={`font-medium ${isOverdue ? 'text-rose-400' : ''}`}>
                        {t.dueDate ? `Due ${t.dueDate}` : 'No due date'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`text-3xs px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] || 'bg-slate-700 text-slate-300'}`}>
                        {t.status || 'To Do'}
                      </span>
                      {t.shootApprovalStatus === 'pending' && t.department === 'Videography/Photography' && (
                        <span className="text-3xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold flex items-center gap-0.5">
                          <CalendarClock className="w-2.5 h-2.5" /> Awaiting Approval
                        </span>
                      )}
                      {t.shootApprovalStatus === 'approved' && t.department === 'Videography/Photography' && (
                        <span className="text-3xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-bold flex items-center gap-0.5">
                          <CalendarCheck className="w-2.5 h-2.5" /> Shoot Approved
                        </span>
                      )}
                      {assignee ? <span className="text-3xs text-slate-500">→ {assignee.name}</span> : null}
                      <span className="text-3xs text-slate-600">by {employees.find(e => e.id === t.assignedBy)?.name || t.assignedBy}</span>
                    </div>
                    {t.status !== 'Completed' && (user.id === t.assignedTo || user.id === t.assignedBy || isManager) && (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        {t.status !== 'New' && t.status !== 'In Progress' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')}
                            className="text-3xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition border border-blue-500/20 font-bold">
                            In Progress
                          </button>
                        )}
                        {t.status === 'New' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')}
                            className="text-3xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition border border-violet-500/20 font-bold">
                            Start
                          </button>
                        )}
                        {(t.status === 'New' || t.status === 'In Progress') && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Review')}
                            className="text-3xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition border border-amber-500/20 font-bold">
                            Review
                          </button>
                        )}
                        {t.status !== 'Completed' && t.status !== 'Blocked' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Completed')}
                            className="text-3xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition border border-emerald-500/20 font-bold">
                            Done
                          </button>
                        )}
                        {t.status !== 'Blocked' && t.status !== 'Completed' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Blocked')}
                            className="text-3xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition border border-rose-500/20 font-bold">
                            Block
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ QUOTATIONS TAB ════════════════════════════════════════════════════ */}
      {activeTab === 'quotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-violet-400" /> New SMM Quotation
              {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3 h-3" /> Manager only</span>}
            </h2>
            {isManager ? (
              <form onSubmit={handleCreateQuote} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Client Name</label>
                  <input type="text" value={quoteClient} onChange={e=>setQuoteClient(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Luna Fashion" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Service Details</label>
                  <textarea value={quoteDetails} onChange={e=>setQuoteDetails(e.target.value)} className="w-full glass-input p-3 rounded-xl h-24 text-sm" placeholder="e.g. 15 Reels, 10 Static Posts..." />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monthly Retainer (₹)</label>
                  <input type="number" value={quoteCost} onChange={e=>setQuoteCost(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="80000" required />
                </div>
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Generate & Download
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
                <Lock className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-500">Only managers can generate client quotations.</p>
              </div>
            )}
          </div>
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-300">Recent Quotations</h3>
            {smmQuotes.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No quotations yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {[...smmQuotes].reverse().map(q => (
                  <div key={q.id} className="glass-card p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-200">{q.clientName}</span>
                      <span className="text-xs font-bold text-violet-400">₹{Number(q.cost).toLocaleString()}/mo</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{q.date} · by {q.createdBy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MOM TAB ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'mom' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-fuchsia-400" /> Minutes of Meeting
              {!isManager && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 font-normal"><Lock className="w-3 h-3" /> Manager only</span>}
            </h2>
            {isManager ? (
              <form onSubmit={handleCreateMom} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Client Name</label>
                    <input type="text" value={momClient} onChange={e=>setMomClient(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Aura Cosmetics" required />
                  </div>
                  <div>
                    <DatePicker label="Meeting Date" value={momDate} onChange={setMomDate} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Attendees</label>
                  <input type="text" value={momAttendees} onChange={e=>setMomAttendees(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm" placeholder="Aarav (Paid Ads), Priya (Client CEO)" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discussion Points</label>
                  <textarea value={momPoints} onChange={e=>setMomPoints(e.target.value)} className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Key items discussed..." required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Action Items</label>
                  <textarea value={momActionItems} onChange={e=>setMomActionItems(e.target.value)} className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="e.g. Sneha to build landing page..." />
                </div>
                <button type="submit" className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Compile & Download MOM
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-slate-800 rounded-xl">
                <Lock className="w-8 h-8 text-slate-600" />
                <p className="text-sm text-slate-500">Only managers can compile meeting minutes.</p>
              </div>
            )}
          </div>
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-300">Recent MOMs</h3>
            {(state.moms||[]).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No MOMs logged yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {[...(state.moms||[])].reverse().map(m => (
                  <div key={m.id} className="glass-card p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-200">{m.clientName}</span>
                      <span className="text-xs text-slate-500">{m.date}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.points}</p>
                    <p className="text-3xs text-slate-600 mt-1">by {m.createdBy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODALS ════════════════════════════════════════════════════════════ */}

      {/* Day detail modal — guard: JSX children eagerly evaluate, so Modal must not exist when selectedDay is null */}
      {selectedDay && (
      <Modal
        open={showDayModal}
        title={`${MONTH_NAMES[calMonth]} ${selectedDay.day}, ${calYear}`}
        onClose={() => setShowDayModal(false)}
        size="lg"
      >
          <div className="space-y-4">
            {canEdit && (
              <button onClick={() => { setShowDayModal(false); openAddPost(selectedDay.dateStr); }}
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
                <div key={post.id} className={`glass-card rounded-xl border p-4 space-y-2 ${isDraft ? 'border-slate-700/60 opacity-70' : c.border}`}>
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
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => { setShowDayModal(false); openEditPost(post); }}
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
                  {canEdit && (
                    <div className="flex gap-2 pt-1">
                      {['Draft','Scheduled','Published','Cancelled'].map(s => (
                        <button key={s} onClick={() => { handleStatusChange(post.id, s); setSelectedDay(prev => ({ ...prev, posts: prev.posts.map(p => p.id === post.id ? {...p, status: s} : p) })); }}
                          className={`text-3xs px-2 py-0.5 rounded-full transition ${post.status === s ? STATUS_STYLES[s] : 'text-slate-500 hover:text-slate-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {!canEdit && (
                    <span className={`text-3xs px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] || ''}`}>{post.status}</span>
                  )}
                </div>
              );
            })}

            {selectedDay.tasks.map(t => (
              <div key={t.id} className="glass-card rounded-xl border border-orange-500/20 p-4 cursor-pointer hover:border-orange-500/40 transition"
                onClick={() => { setSelectedTask(t); setShowDayModal(false); }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold">📌 Task</span>
                  <span className="text-3xs text-slate-500">{t.department}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-200">{t.title}</h4>
                {t.description && <p className="text-xs text-slate-400 mt-1">{t.description}</p>}
                <p className="text-3xs text-slate-500 mt-1">by {t.assignedBy || 'Social Media'}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Post add/edit modal */}
      <Modal
        open={showPostModal}
        title={editingPost ? 'Edit Calendar Entry' : 'Add to Content Calendar'}
        onClose={() => { setShowPostModal(false); setEditingPost(null); setPostForm(blankPost()); }}
        size="lg"
      >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Post / Content Title *</label>
              <input type="text" value={postForm.title} onChange={e=>setPostForm(f=>({...f,title:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Skincare Serum Reel" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Client</label>
              <input type="text" value={postForm.client_id} onChange={e=>setPostForm(f=>({...f,client_id:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Luna Fashion" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <DatePicker label="Date" value={postForm.postDate} onChange={v => setPostForm(f => ({...f, postDate: v}))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Time</label>
                <input type="time" value={postForm.postTime} onChange={e=>setPostForm(f=>({...f,postTime:e.target.value}))}
                  className="w-full glass-input p-3 rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Platform</label>
                <select value={postForm.platform} onChange={e=>setPostForm(f=>({...f,platform:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
                  {Object.keys(PLATFORM_COLORS).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={postForm.status} onChange={e=>setPostForm(f=>({...f,status:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
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
                            <select value={postForm[`${assignKey}SubType`] || ''} onChange={e=>setPostForm(f=>({...f,[`${assignKey}SubType`]:e.target.value,[assignKey]:'',needsBothRoles:false,assignedPhotoCo:''}))}
                              className="glass-input p-2 rounded-lg text-xs shrink-0">
                              <option value="">All Roles</option>
                              <option value="Videographer">Videographer</option>
                              <option value="Content Creator">Content Creator</option>
                            </select>
                          )}
                          <select value={postForm[assignKey]} onChange={e=>setPostForm(f=>({...f,[assignKey]:e.target.value}))}
                            className="glass-input p-2 rounded-lg text-xs flex-1">
                            <option value="">— Auto-assign (anyone in dept) —</option>
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
                      {isVideography && isChecked && postForm[`${assignKey}SubType`] && (
                        <div className="flex items-center gap-2 ml-6">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={postForm.needsBothRoles || false}
                              onChange={e=>setPostForm(f=>({...f,needsBothRoles:e.target.checked,assignedPhotoCo:e.target.checked?f.assignedPhotoCo:''}))}
                              className="sr-only peer" />
                            <div className="w-8 h-4 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
                          </label>
                          <span className="text-3xs text-slate-400">Requires both roles?</span>
                        </div>
                      )}
                      {isVideography && isChecked && postForm.needsBothRoles && postForm[`${assignKey}SubType`] && (() => {
                        const oppositeRole = postForm[`${assignKey}SubType`] === 'Videographer' ? 'Content Creator' : 'Videographer';
                        const coEmployees = employees.filter(e =>
                          e.department?.includes(deptName) && e.subType === oppositeRole
                        );
                        return coEmployees.length > 0 ? (
                          <div className="flex items-center gap-2 ml-6">
                            <select value={postForm.assignedPhotoCo || ''} onChange={e=>setPostForm(f=>({...f,assignedPhotoCo:e.target.value}))}
                              className="glass-input p-2 rounded-lg text-xs flex-1">
                              <option value="">— Co-assignee ({oppositeRole}) —</option>
                              {coEmployees.map(e => {
                                const info = dueDate ? getWorkloadInfo(tasks, e.id, dueDate, deptName, 'Medium') : null;
                                const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                                return <option key={e.id} value={e.id} className={
                                  info?.color === 'red' ? 'text-red-400' :
                                  info?.color === 'amber' ? 'text-amber-400' : ''
                                }>{label}</option>;
                              })}
                            </select>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Caption / Notes</label>
              <textarea value={postForm.caption} onChange={e=>setPostForm(f=>({...f,caption:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Include hashtags, tags, brief..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSavePost}
                className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> {editingPost ? 'Save Changes' : 'Add to Calendar'}
              </button>
              <button onClick={() => { setShowPostModal(false); setEditingPost(null); setPostForm(blankPost()); }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
                Cancel
              </button>
            </div>
          </div>
        </Modal>

      {/* Cross-dept task modal */}
      <Modal
        open={showTaskModal}
        title="Assign Task to Another Department"
        onClose={() => { setShowTaskModal(false); setTaskForm(blankTask()); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee(''); }}
        size="lg"
      >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
              <input type="text" value={taskForm.title} onChange={e=>setTaskForm(f=>({...f,title:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Create 3 reels for client campaign" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea value={taskForm.description} onChange={e=>setTaskForm(f=>({...f,description:e.target.value}))}
                className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Details, references, links..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Department *</label>
                <select value={taskForm.targetDept} onChange={e=>{setTaskForm(f=>({...f,targetDept:e.target.value,assignedTo:''})); setCrossDeptSubType('');}} className="w-full glass-input p-3 rounded-xl text-sm">
                  {['Video Editors','Graphic Designers','Videography/Photography','Developers','Paid Ads'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              {isVideographyTarget ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role Type</label>
                  <select value={crossDeptSubType} onChange={e=>{setCrossDeptSubType(e.target.value); setTaskForm(f=>({...f,assignedTo:''})); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee('');}} className="w-full glass-input p-3 rounded-xl text-sm">
                    <option value="">All Roles</option>
                    <option value="Videographer">Videographer</option>
                    <option value="Content Creator">Content Creator / Influencer</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assign to (optional)</label>
                  <select value={taskForm.assignedTo} onChange={e=>setTaskForm(f=>({...f,assignedTo:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
                    <option value="">Whole department</option>
                    {deptEmployees.map(e => {
                      const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
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
                <select value={taskForm.assignedTo} onChange={e=>setTaskForm(f=>({...f,assignedTo:e.target.value}))} className="w-full glass-input p-3 rounded-xl text-sm">
                  <option value="">Whole department</option>
                  {deptEmployees.map(e => {
                    const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
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
            {isVideographyTarget && crossDeptSubType && (
              <div className="flex items-center gap-3 px-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={crossDeptNeedsBoth}
                    onChange={e=>{setCrossDeptNeedsBoth(e.target.checked); if(!e.target.checked) setCrossDeptCoAssignee('');}}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
                <span className="text-xs text-slate-400">Requires both roles?</span>
              </div>
            )}
            {crossDeptNeedsBoth && crossDeptCoStaff.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Co-Assignee ({crossDeptSubType === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
                <select value={crossDeptCoAssignee} onChange={e=>setCrossDeptCoAssignee(e.target.value)} className="w-full glass-input p-3 rounded-xl text-sm">
                  <option value="">— Select co-assignee —</option>
                  {crossDeptCoStaff.map(e => {
                    const dueDate = computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 });
                    const info = dueDate && isCreativeDept ? getWorkloadInfo(tasks, e.id, dueDate, taskForm.targetDept, taskForm.priority) : null;
                    const label = info ? formatWorkloadLabel(e.name, info.load, info.softMax, dueDate) : e.name;
                    return <option key={e.id} value={e.id} className={
                      info?.color === 'red' ? 'text-red-400' :
                      info?.color === 'amber' ? 'text-amber-400' : ''
                    }>{label}</option>;
                  })}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select value={taskForm.priority} onChange={e=>setTaskForm(f=>({...f,priority:e.target.value,timelineDays: e.target.value === 'Emergency' ? '0' : f.timelineDays}))} className="w-full glass-input p-3 rounded-xl text-sm">
                  {['Low','Medium','High','Emergency'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              {taskForm.priority === 'Emergency' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Completion Timeline</label>
                  <select value={taskForm.timelineDays} onChange={e=>setTaskForm(f=>({...f,timelineDays:e.target.value}))}
                    className="w-full glass-input p-3 rounded-xl text-sm">
                    <option value="0">Today (ASAP)</option>
                    <option value="1">Tomorrow (End of day)</option>
                    <option value="2">Day After Tomorrow</option>
                  </select>
                  <p className="text-3xs text-rose-400 mt-1 font-semibold">Due: {computeDueDate({ priority: taskForm.priority, timelineDays: taskForm.timelineDays, dueDate: taskForm.dueDate, rule, fallbackDays: 0 })}</p>
                </div>
              ) : rule.mode === 'manual' ? (
                <div>
                  <DatePicker label="Due Date" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({...f, dueDate: v}))} />
                </div>
              ) : rule.mode === 'select' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Timeline</label>
                  <select value={taskForm.timelineDays} onChange={e=>setTaskForm(f=>({...f,timelineDays:e.target.value}))}
                    className="w-full glass-input p-3 rounded-xl text-sm">
                    {(rule.options || [3, 5]).map(d => (
                      <option key={d} value={d}>{d} Days from today</option>
                    ))}
                  </select>
                  <p className="text-3xs text-slate-500 mt-1">Due: {addDays(today(), parseInt(taskForm.timelineDays || '3'))}</p>
                </div>
              ) : rule.mode === 'fixed' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <p className="text-xs text-slate-300 mt-2">Auto: {addDays(today(), rule.days)} (fixed {rule.days} days)</p>
                </div>
              ) : (
                <div>
                  <DatePicker label="Due Date" value={taskForm.dueDate} onChange={v => setTaskForm(f => ({...f, dueDate: v}))} />
                </div>
              )}
            </div>
            {isCreativeDept && (
              <div>
                <DatePicker label="Prior Date" value={taskForm.scheduledDate} onChange={v => setTaskForm(f => ({...f, scheduledDate: v}))} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleAssignTask}
                className="flex-1 bg-neon-gradient py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Send Task
              </button>
              <button onClick={() => { setShowTaskModal(false); setTaskForm(blankTask()); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee(''); }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition">
                Cancel
              </button>
            </div>
            {deptEmployees.length === 0 && (
              <p className="text-xs text-slate-500 text-center">No employees found in {taskForm.targetDept} — task will be visible to that department when they check their workspace.</p>
            )}
          </div>
        </Modal>

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, message: '', onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        message={confirmState.message}
      />

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
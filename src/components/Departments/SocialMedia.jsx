import { useState, useMemo } from 'react';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, X,
  Send, CalendarClock, CalendarCheck,
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { db } from '../../data/db';
import { Modal, ConfirmDialog } from '../ui';
import TaskDetailPanel from '../shared/TaskDetailPanel';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { genId, today, addDays } from '../../lib/format';
import { CREATIVE_DEPTS } from '../../lib/constants';
import QuotationsTab from './SocialMedia/QuotationsTab';
import MOMTab from './SocialMedia/MOMTab';
import DayDetailModal from './SocialMedia/DayDetailModal';
import PostModal from './SocialMedia/PostModal';
import TaskForm from '../shared/TaskForm';

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
  const [dayTaskFilterEmp, setDayTaskFilterEmp] = useState('');

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
  // ── Cross-dept task assign ────────────────────────────────────────────────
  const handleAssignTask = (taskData) => {
    const now = new Date().toISOString();

    // Notify assignee or whole target dept
    const toNotify = taskData.assignedTo
      ? [employees.find(e => e.id === taskData.assignedTo)].filter(Boolean)
      : employees.filter(e => e.department?.includes(taskData.department));
    if (taskData.assignedTo2) {
      const co = employees.find(e => e.id === taskData.assignedTo2);
      if (co) toNotify.push(co);
    }
    const newNotifs = toNotify.map(emp => ({
      id: genId('NTF') + `_${emp.id}`,
      userId: emp.id,
      message: `📌 Social Media assigned you a task: "${taskData.title}"${taskData.dueDate ? ` — due ${taskData.dueDate}` : ''}`,
      type: 'assignment',
      timestamp: now,
      read: false,
    }));

    updateState({
      tasks: [...tasks, taskData],
      ...(newNotifs.length ? { notifications: [...notifications, ...newNotifs] } : {}),
    });
    db.addTask(taskData).catch(err => console.warn('[SocialMedia] Failed to add task:', err));

    toast.success(`Task "${taskData.title}" assigned to ${taskData.department}.`);
    setShowTaskModal(false);
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
              <div key={`e${i}`} className="min-h-[110px] border-r border-b border-slate-800/50 bg-slate-900/20" />
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
                  className={`min-h-[110px] border-r border-b border-slate-800/50 p-2 cursor-pointer transition group relative
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
                      {assignee ? <span className="text-xs text-slate-500">→ {assignee.name}</span> : null}
                      <span className="text-xs text-slate-600">by {employees.find(e => e.id === t.assignedBy)?.name || t.assignedBy}</span>
                    </div>
                    {t.status !== 'Completed' && (user.id === t.assignedTo || user.id === t.assignedBy || isManager) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {t.status !== 'New' && t.status !== 'In Progress' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')}
                            className="text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition border border-blue-500/20 font-bold">
                            In Progress
                          </button>
                        )}
                        {t.status === 'New' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')}
                            className="text-xs px-3 py-1 rounded-full bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition border border-violet-500/20 font-bold">
                            Start
                          </button>
                        )}
                        {(t.status === 'New' || t.status === 'In Progress') && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Review')}
                            className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition border border-amber-500/20 font-bold">
                            Review
                          </button>
                        )}
                        {t.status !== 'Completed' && t.status !== 'Blocked' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Completed')}
                            className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition border border-emerald-500/20 font-bold">
                            Done
                          </button>
                        )}
                        {t.status !== 'Blocked' && t.status !== 'Completed' && (
                          <button onClick={() => handleTaskStatusChange(t.id, 'Blocked')}
                            className="text-xs px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition border border-rose-500/20 font-bold">
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

      {activeTab === 'quotes' && (
        <QuotationsTab
          smmQuotes={smmQuotes}
          handleCreateQuote={handleCreateQuote}
          quoteClient={quoteClient} setQuoteClient={setQuoteClient}
          quoteDetails={quoteDetails} setQuoteDetails={setQuoteDetails}
          quoteCost={quoteCost} setQuoteCost={setQuoteCost}
          isManager={isManager}
        />
      )}

      {/* ══ MOM TAB ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'mom' && (
        <MOMTab
          moms={state.moms}
          handleCreateMom={handleCreateMom}
          momClient={momClient} setMomClient={setMomClient}
          momDate={momDate} setMomDate={setMomDate}
          momAttendees={momAttendees} setMomAttendees={setMomAttendees}
          momPoints={momPoints} setMomPoints={setMomPoints}
          momActionItems={momActionItems} setMomActionItems={setMomActionItems}
          isManager={isManager}
        />
      )}

      <DayDetailModal
        selectedDay={selectedDay}
        showDayModal={showDayModal}
        setShowDayModal={setShowDayModal}
        MONTH_NAMES={MONTH_NAMES}
        calMonth={calMonth}
        calYear={calYear}
        canEdit={canEdit}
        openAddPost={openAddPost}
        openEditPost={openEditPost}
        PLATFORM_COLORS={PLATFORM_COLORS}
        STATUS_STYLES={STATUS_STYLES}
        handleDeletePost={handleDeletePost}
        handleStatusChange={handleStatusChange}
        setSelectedDay={setSelectedDay}
        dayTaskFilterEmp={dayTaskFilterEmp}
        setDayTaskFilterEmp={setDayTaskFilterEmp}
        employees={employees}
        setSelectedTask={setSelectedTask}
      />

      <PostModal
        showPostModal={showPostModal}
        setShowPostModal={setShowPostModal}
        editingPost={editingPost}
        setEditingPost={setEditingPost}
        postForm={postForm}
        setPostForm={setPostForm}
        blankPost={blankPost}
        handleSavePost={handleSavePost}
        PLATFORM_COLORS={PLATFORM_COLORS}
        employees={employees}
        tasks={tasks}
        DEPT_LEAD_WINDOWS={DEPT_LEAD_WINDOWS}
        getWorkloadInfo={getWorkloadInfo}
        formatWorkloadLabel={formatWorkloadLabel}
        addDays={addDays}
      />

      {showTaskModal && (
        <Modal open={showTaskModal} title="Assign Task to Another Department" onClose={() => setShowTaskModal(false)} size="lg">
          <TaskForm
            sourceDept="Social Media"
            targetDept="Video Editors"
            showDescription={true}
            showAssignee={true}
            showProject={false}
            onSubmit={handleAssignTask}
            onCancel={() => setShowTaskModal(false)}
            employees={employees}
            tasks={tasks}
            currentUser={user}
          />
        </Modal>
      )}

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
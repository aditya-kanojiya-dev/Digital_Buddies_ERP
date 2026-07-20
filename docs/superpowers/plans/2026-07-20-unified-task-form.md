# Unified Task Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a single shared `<TaskForm>` component used by ManagerDashboard, SocialMedia, and DeptCalendar. Normalize the task data shape so all callers produce consistent objects.

**Architecture:** One `TaskForm` component in `src/components/shared/` that accepts props to control which fields are visible. Callers pass `sourceDept`, `showDescription`, `showProject`, `showAssignee`, and an `onSubmit` callback. The form manages its own internal state and produces a normalized task object on submit. `DEPT_TIMELINE_RULES` moves to `src/lib/constants.js` so all consumers can import it.

**Tech Stack:** React 19, Vite 8, Supabase, Tailwind CSS, lucide-react icons

## Global Constraints

- React 19 + Vite 8 + Supabase
- Tailwind CSS with `glass-input`, `glass-panel`, `bg-neon-gradient` utility classes
- Task ID prefix: `T` (normalized across all callers)
- `computeDueDate` imported from `src/lib/format.js`
- `getWorkloadInfo` / `formatWorkloadLabel` imported from `src/lib/workloadCaps.js`
- `DatePicker` imported from `src/components/ui`
- `useToast` imported from `src/components/shared/Toast`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/constants.js` | Modify | Add `ALLOWED_TARGET_DEPTS`, `CREATIVE_DEPTS`, `DEPT_TIMELINE_RULES` |
| `src/components/shared/TaskForm.jsx` | Create | Shared task creation form component |
| `src/components/ManagerDashboard.jsx` | Modify | Replace inline form with `<TaskForm>`, import constants from `src/lib/constants.js` |
| `src/components/Departments/SocialMedia.jsx` | Modify | Replace `<CrossDeptTaskModal>` with `<TaskForm>` |
| `src/components/shared/DeptCalendar.jsx` | Modify | Replace inline modal form with `<TaskForm>` |
| `src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx` | Delete | Replaced by TaskForm |

---

### Task 1: Move shared constants to `src/lib/constants.js`

**Files:**
- Modify: `src/lib/constants.js`
- Modify: `src/components/ManagerDashboard.jsx:13-22`
- Modify: `src/components/Departments/SocialMedia.jsx` (imports `CREATIVE_DEPTS` from ManagerDashboard)
- Modify: `src/components/shared/DeptCalendar.jsx` (imports `getWorkloadInfo` — no constant imports yet)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `ALLOWED_TARGET_DEPTS`, `CREATIVE_DEPTS`, `DEPT_TIMELINE_RULES` exported from `src/lib/constants.js`

- [ ] **Step 1: Add constants to `src/lib/constants.js`**

Append to the existing file (which already has `ROLES`):

```js
// Department constants — single source of truth
export const ALLOWED_TARGET_DEPTS = ['Developers', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Paid Ads', 'Social Media'];

export const CREATIVE_DEPTS = ['Video Editors', 'Graphic Designers', 'Videography/Photography'];

export const DEPT_TIMELINE_RULES = {
  'Developers':              { mode: 'manual', label: 'Manual' },
  'Paid Ads':                { mode: 'manual', label: 'Manual' },
  'Video Editors':           { mode: 'select', options: [3, 5], label: 'Editors timeline' },
  'Graphic Designers':       { mode: 'select', options: [3, 5], label: 'Designers timeline' },
  'Videography/Photography': { mode: 'select', options: [3, 4, 5], label: 'Videography timeline' },
};
```

- [ ] **Step 2: Update ManagerDashboard imports**

In `src/components/ManagerDashboard.jsx`, change lines 13-22 from:

```js
const ALLOWED_TARGET_DEPTS = ['Developers', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Paid Ads', 'Social Media'];
export const CREATIVE_DEPTS = ['Video Editors', 'Graphic Designers', 'Videography/Photography'];

export const DEPT_TIMELINE_RULES = {
  'Developers':              { mode: 'manual', label: 'Manual' },
  'Paid Ads':                { mode: 'manual', label: 'Manual' },
  'Video Editors':           { mode: 'select', options: [3, 5], label: 'Editors timeline' },
  'Graphic Designers':       { mode: 'select', options: [3, 5], label: 'Designers timeline' },
  'Videography/Photography': { mode: 'select', options: [3, 4, 5], label: 'Videography timeline' },
};
```

to:

```js
import { ALLOWED_TARGET_DEPTS, CREATIVE_DEPTS, DEPT_TIMELINE_RULES } from '../lib/constants';
```

Place this import after line 5 (`import { genId, today as todayStr, addDays, computeDueDate } from '../lib/format';`).

- [ ] **Step 3: Update SocialMedia imports**

In `src/components/Departments/SocialMedia.jsx`, find where `CREATIVE_DEPTS` is imported (it's imported from `../../components/ManagerDashboard` or defined locally). Change the import to come from `../../lib/constants` instead. Also ensure `DEPT_TIMELINE_RULES` and `ALLOWED_TARGET_DEPTS` are imported from `../../lib/constants`.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL (no errors, warnings about unused imports are ok)

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.js src/components/ManagerDashboard.jsx src/components/Departments/SocialMedia.jsx
git commit -m "refactor: move DEPT_TIMELINE_RULES and dept constants to shared constants.js"
```

---

### Task 2: Create the shared `TaskForm` component

**Files:**
- Create: `src/components/shared/TaskForm.jsx`

**Interfaces:**
- Consumes: `ALLOWED_TARGET_DEPTS`, `CREATIVE_DEPTS`, `DEPT_TIMELINE_RULES` from `src/lib/constants.js`; `computeDueDate`, `genId`, `today as todayStr`, `addDays` from `src/lib/format.js`; `getWorkloadInfo`, `formatWorkloadLabel` from `src/lib/workloadCaps.js`; `DatePicker` from `src/components/ui`; `useToast` from `src/components/shared/Toast`
- Produces: calls `onSubmit(taskData)` with the normalized task object shape

- [ ] **Step 1: Create `src/components/shared/TaskForm.jsx`**

```jsx
import { useState, useMemo } from 'react';
import { Send } from 'lucide-react';
import { useToast } from './Toast';
import { genId, today as todayStr, addDays, computeDueDate } from '../../lib/format';
import { getWorkloadInfo, formatWorkloadLabel } from '../../lib/workloadCaps';
import { ALLOWED_TARGET_DEPTS, CREATIVE_DEPTS, DEPT_TIMELINE_RULES } from '../../lib/constants';
import { DatePicker } from '../ui';

/**
 * Shared task creation form used by ManagerDashboard, SocialMedia, and DeptCalendar.
 *
 * Props:
 *   sourceDept      string  required  Who is creating (e.g. "Social Media", "Work Assignment")
 *   targetDept      string  ''        Pre-selected target department
 *   showDescription boolean false     Show description textarea
 *   showAssignee    boolean true      Show assignee picker
 *   showProject     boolean true      Show project selector
 *   onSubmit        function required  Called with normalized task data object
 *   onCancel        function required  Close/reset handler
 *   employees       array   required  Employee list for assignee pickers
 *   tasks           array   required  Current tasks for workload cap checks
 *   projects        array   []        Project list for project picker
 *   currentUser     object  required  Current user for assignedBy
 */
export default function TaskForm({
  sourceDept,
  targetDept: initialTargetDept = '',
  showDescription = false,
  showAssignee = true,
  showProject = true,
  onSubmit,
  onCancel,
  employees,
  tasks = [],
  projects = [],
  currentUser,
}) {
  const toast = useToast();

  // ── Internal form state ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDept, setTargetDept] = useState(initialTargetDept);
  const [assigneeId, setAssigneeId] = useState('');
  const [coAssigneeId, setCoAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [timelineDays, setTimelineDays] = useState('3');
  const [scheduledDate, setScheduledDate] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [needsBothRoles, setNeedsBothRoles] = useState(false);

  // ── Derived state ──
  const rule = DEPT_TIMELINE_RULES[targetDept] || {};
  const isVideographyDept = targetDept === 'Videography/Photography';
  const isCreativeDept = CREATIVE_DEPTS.includes(targetDept);

  const deptStaff = useMemo(() =>
    targetDept
      ? employees.filter(e =>
          e.department?.includes(targetDept) &&
          (!isVideographyDept || !subTypeFilter || e.subType === subTypeFilter)
        )
      : []
  , [employees, targetDept, isVideographyDept, subTypeFilter]);

  const coDeptStaff = useMemo(() =>
    needsBothRoles && isVideographyDept && subTypeFilter
      ? employees.filter(e =>
          e.department?.includes(targetDept) &&
          e.subType !== subTypeFilter &&
          e.id !== assigneeId
        )
      : []
  , [employees, targetDept, needsBothRoles, isVideographyDept, subTypeFilter, assigneeId]);

  const computedDueDate = computeDueDate({ priority, timelineDays, dueDate, rule, fallbackDays: 0 });

  // ── Submit handler ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Task title is required.'); return; }
    if (!targetDept) { toast.error('Target department is required.'); return; }
    if (showAssignee && !assigneeId) { toast.error('Please select an assignee.'); return; }

    const finalDueDate = computedDueDate;
    const assignee = assigneeId ? employees.find(emp => emp.id === assigneeId) : null;
    const coAssignee = needsBothRoles && coAssigneeId ? employees.find(emp => emp.id === coAssigneeId) : null;

    // ── Workload cap check ──
    if (assigneeId && finalDueDate && isCreativeDept) {
      const info = getWorkloadInfo(tasks, assigneeId, finalDueDate, targetDept, priority);
      if (!info.canAssign) { toast.error(info.reason); return; }
      if (info.reason && !info.reason.startsWith('⚠️')) { toast.warning(info.reason); }
    }
    if (coAssigneeId && finalDueDate && isCreativeDept) {
      const coInfo = getWorkloadInfo(tasks, coAssigneeId, finalDueDate, targetDept, priority);
      if (!coInfo.canAssign) { toast.error(`Co-assignee: ${coInfo.reason}`); return; }
    }

    const isVideography = targetDept === 'Videography/Photography';
    const now = new Date().toISOString();

    const taskData = {
      id:                `T${Date.now()}`,
      title:             title.trim(),
      description:       showDescription ? description.trim() : '',
      assignedTo:        assigneeId || null,
      assigneeName:      assignee?.name || '',
      assignedTo2:       coAssigneeId || null,
      assigneeName2:     coAssignee?.name || '',
      assignedBy:        currentUser.id,
      department:        targetDept,
      sourceDept:        sourceDept,
      projectId:         showProject ? (taskProject || 'General') : 'General',
      priority,
      status:            'New',
      dueDate:           finalDueDate || '',
      scheduledDate:     isCreativeDept && scheduledDate ? scheduledDate : null,
      createdAt:         now.split('T')[0],
      pinged:            0,
      lastPingedAt:      null,
      shootApprovalStatus: isVideography ? 'pending' : null,
    };

    onSubmit(taskData);

    // Reset form
    setTitle(''); setDescription(''); setAssigneeId(''); setCoAssigneeId('');
    setPriority('Medium'); setDueDate(''); setTimelineDays('3'); setScheduledDate('');
    setTaskProject(''); setSubTypeFilter(''); setNeedsBothRoles(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full glass-input p-3 rounded-xl text-sm" placeholder="e.g. Design Summer Banner" required />
      </div>

      {/* Description (optional) */}
      {showDescription && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="w-full glass-input p-3 rounded-xl h-20 text-sm" placeholder="Details, references, links..." />
        </div>
      )}

      {/* Target Department */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Target Department *</label>
        <select value={targetDept} onChange={e => { setTargetDept(e.target.value); setAssigneeId(''); setSubTypeFilter(''); setNeedsBothRoles(false); setCoAssigneeId(''); }}
          className="w-full glass-input p-3 rounded-xl text-xs" required>
          <option value="">-- Select department --</option>
          {ALLOWED_TARGET_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Role Type (Videography only) */}
      {isVideographyDept && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Role Type</label>
          <select value={subTypeFilter} onChange={e => { setSubTypeFilter(e.target.value); setAssigneeId(''); setCoAssigneeId(''); setNeedsBothRoles(false); }}
            className="w-full glass-input p-3 rounded-xl text-xs">
            <option value="">All Roles</option>
            <option value="Videographer">Videographer</option>
            <option value="Content Creator">Content Creator / Influencer</option>
          </select>
        </div>
      )}

      {/* Requires both roles toggle (Videography only) */}
      {isVideographyDept && subTypeFilter && (
        <div className="flex items-center gap-3 px-1">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={needsBothRoles}
              onChange={e => { setNeedsBothRoles(e.target.checked); if (!e.target.checked) setCoAssigneeId(''); }}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-slate-700 peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
          <span className="text-xs text-slate-400">Requires both roles?</span>
        </div>
      )}

      {/* Assignee + Project row */}
      {showAssignee && (
        <div className={`grid gap-4 ${showProject ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Assignee *</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs" required disabled={!targetDept}>
              <option value="">-- Select --</option>
              {deptStaff.map(emp => {
                const info = computedDueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, computedDueDate, targetDept, priority) : null;
                const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, computedDueDate) : emp.name;
                return <option key={emp.id} value={emp.id} className={
                  info?.color === 'red' ? 'text-red-400' :
                  info?.color === 'amber' ? 'text-amber-400' : ''
                }>{label}</option>;
              })}
            </select>
          </div>
          {showProject && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project</label>
              <select value={taskProject} onChange={e => setTaskProject(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-xs">
                <option value="General">General Task</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Co-Assignee (Videography, both roles required) */}
      {needsBothRoles && coDeptStaff.length > 0 && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Co-Assignee ({subTypeFilter === 'Videographer' ? 'Content Creator' : 'Videographer'})</label>
          <select value={coAssigneeId} onChange={e => setCoAssigneeId(e.target.value)}
            className="w-full glass-input p-3 rounded-xl text-xs" required>
            <option value="">-- Select co-assignee --</option>
            {coDeptStaff.map(emp => {
              const info = computedDueDate && isCreativeDept ? getWorkloadInfo(tasks, emp.id, computedDueDate, targetDept, priority) : null;
              const label = info ? formatWorkloadLabel(emp.name, info.load, info.softMax, computedDueDate) : emp.name;
              return <option key={emp.id} value={emp.id} className={
                info?.color === 'red' ? 'text-red-400' :
                info?.color === 'amber' ? 'text-amber-400' : ''
              }>{label}</option>;
            })}
          </select>
        </div>
      )}

      {/* Priority + Due Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Priority</label>
          <select value={priority} onChange={e => { setPriority(e.target.value); if (e.target.value === 'Emergency') setTimelineDays('0'); }}
            className="w-full glass-input p-3 rounded-xl text-xs">
            <option value="Emergency">Emergency</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
        {priority === 'Emergency' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Completion Timeline</label>
            <select value={timelineDays} onChange={e => setTimelineDays(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs">
              <option value="0">Today (ASAP)</option>
              <option value="1">Tomorrow (End of day)</option>
              <option value="2">Day After Tomorrow</option>
            </select>
            <p className="text-3xs text-rose-400 mt-1 font-semibold">Due: {computedDueDate}</p>
          </div>
        ) : rule.mode === 'manual' ? (
          <div>
            <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
        ) : rule.mode === 'select' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Timeline</label>
            <select value={timelineDays} onChange={e => setTimelineDays(e.target.value)}
              className="w-full glass-input p-3 rounded-xl text-xs">
              {(rule.options || [3, 5]).map(d => (
                <option key={d} value={d}>{d} Days from today</option>
              ))}
            </select>
            <p className="text-3xs text-slate-500 mt-1">Due: {addDays(todayStr(), parseInt(timelineDays))}</p>
          </div>
        ) : rule.mode === 'fixed' ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Due Date</label>
            <p className="text-xs text-slate-300 mt-2">Auto: {addDays(todayStr(), rule.days)} (fixed {rule.days} days)</p>
          </div>
        ) : (
          <div>
            <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
        )}
      </div>

      {/* Prior Date (creative depts only) */}
      {isCreativeDept && (
        <div>
          <DatePicker label="Prior Date" value={scheduledDate} onChange={setScheduledDate} />
        </div>
      )}

      {/* Submit + Cancel */}
      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="flex-1 bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> Assign Work Entry
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/TaskForm.jsx
git commit -m "feat: add shared TaskForm component for unified task creation"
```

---

### Task 3: Wire ManagerDashboard to use TaskForm

**Files:**
- Modify: `src/components/ManagerDashboard.jsx`

**Interfaces:**
- Consumes: `TaskForm` from `src/components/shared/TaskForm`
- Produces: same `handleCreateTask` callback (receives normalized task data from TaskForm)

- [ ] **Step 1: Import TaskForm**

Add after line 7 (`import TaskCard from './shared/TaskCard';`):

```js
import TaskForm from './shared/TaskForm';
```

- [ ] **Step 2: Replace the inline form**

In `src/components/ManagerDashboard.jsx`, replace the entire form block from line 655 (`<form onSubmit={handleCreateTask} className="space-y-4">`) through line 789 (`</form>`) with:

```jsx
<TaskForm
  sourceDept="Work Assignment"
  targetDept={targetDept}
  showDescription={false}
  showAssignee={true}
  showProject={true}
  onSubmit={handleCreateTask}
  onCancel={() => { setTargetDept(''); setTaskTitle(''); setAssigneeId(''); setTaskProject(''); setTaskPriority('Medium'); setTaskDue(''); setTimelineDays('3'); setTaskScheduledDate(''); setSubTypeFilter(''); setNeedsBothRoles(false); setCoAssigneeId(''); }}
  employees={employees}
  tasks={tasks}
  projects={projects}
  currentUser={user}
/>
```

- [ ] **Step 3: Update `handleCreateTask` to receive normalized task data**

Replace the current `handleCreateTask` function (lines ~120-202) with a version that receives `taskData` from TaskForm instead of building it from individual state variables:

```jsx
const handleCreateTask = (taskData) => {
  const staffMember = employees.find(emp => emp.id === taskData.assignedTo);
  const coMember = taskData.assignedTo2 ? employees.find(emp => emp.id === taskData.assignedTo2) : null;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newNotifs = [{
    id:        genId('NTF'),
    userId:    taskData.assignedTo,
    message:   `${user.name} assigned task "${taskData.title}" to you.`,
    type:      'assignment',
    timestamp: now,
    read:      false,
  }];
  if (coMember) {
    newNotifs.push({
      id:        `NTF${Date.now()}_co`,
      userId:    taskData.assignedTo2,
      message:   `${user.name} assigned you as co-assignee on "${taskData.title}".`,
      type:      'assignment',
      timestamp: now,
      read:      false,
    });
  }

  updateState({
    tasks: [...tasks, taskData],
    notifications: [...newNotifs, ...notifications],
    auditLogs: [{
      id:        genId('AUD'),
      userId:    user.id,
      action:    'Task Created',
      details:   `${user.name} assigned task "${taskData.title}" to ${staffMember?.name}${coMember ? ` + ${coMember?.name}` : ''} (${taskData.department}).`,
      timestamp: now,
    }, ...state.auditLogs],
  });

  toast.success(`Task assigned to ${staffMember?.name}${coMember ? ` + ${coMember.name}` : ''}.`, `"${taskData.title}"`);
};
```

- [ ] **Step 4: Remove now-unused state variables**

Remove these state declarations that are now managed internally by TaskForm (lines ~37-47):

```js
// REMOVE these lines:
const [targetDept,   setTargetDept]   = useState('');
const [taskTitle,    setTaskTitle]    = useState('');
const [assigneeId,   setAssigneeId]   = useState('');
const [taskProject,  setTaskProject]  = useState('');
const [taskPriority, setTaskPriority] = useState('Medium');
const [taskDue,      setTaskDue]      = useState('');
const [timelineDays, setTimelineDays] = useState('3');
const [taskScheduledDate, setTaskScheduledDate] = useState('');
const [subTypeFilter, setSubTypeFilter] = useState('');
const [needsBothRoles, setNeedsBothRoles] = useState(false);
const [coAssigneeId, setCoAssigneeId] = useState('');
```

Also remove the derived variables that are no longer needed in ManagerDashboard (they're now inside TaskForm):

```js
// REMOVE these lines:
const rule = DEPT_TIMELINE_RULES[targetDept] || {};
const isVideographyDept = targetDept === 'Videography/Photography';
const deptStaff = ... (lines 51-56)
const coDeptStaff = ... (lines 57-63)
const isCreativeDept = CREATIVE_DEPTS.includes(targetDept);
```

But **keep** `deptStaff` and `deptTasks` if they're used elsewhere in the component for the task list/metrics. Check usage before removing.

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add src/components/ManagerDashboard.jsx
git commit -m "refactor: replace ManagerDashboard inline form with shared TaskForm"
```

---

### Task 4: Wire SocialMedia to use TaskForm

**Files:**
- Modify: `src/components/Departments/SocialMedia.jsx`
- Delete: `src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx`

**Interfaces:**
- Consumes: `TaskForm` from `../../components/shared/TaskForm`
- Produces: same `handleAssignTask` logic (receives normalized task data from TaskForm)

- [ ] **Step 1: Import TaskForm**

Add after existing imports in `src/components/Departments/SocialMedia.jsx`:

```js
import TaskForm from '../shared/TaskForm';
```

- [ ] **Step 2: Replace CrossDeptTaskModal usage**

In `src/components/Departments/SocialMedia.jsx`, replace the `<CrossDeptTaskModal ... />` block (lines ~1157-1182) with:

```jsx
{showTaskModal && (
  <Modal title="Assign Task to Another Department" onClose={() => { setShowTaskModal(false); setTaskForm(blankTask()); }} size="lg">
    <TaskForm
      sourceDept="Social Media"
      targetDept={taskForm.targetDept}
      showDescription={true}
      showAssignee={true}
      showProject={false}
      onSubmit={handleAssignTask}
      onCancel={() => { setShowTaskModal(false); setTaskForm(blankTask()); setCrossDeptNeedsBoth(false); setCrossDeptCoAssignee(''); }}
      employees={employees}
      tasks={tasks}
      currentUser={user}
    />
  </Modal>
)}
```

Note: You'll need to import `Modal` from `../ui` if not already imported.

- [ ] **Step 3: Update `handleAssignTask` to receive normalized task data**

Replace the current `handleAssignTask` (lines ~602-684) with a version that receives `taskData` from TaskForm:

```jsx
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
  setTaskForm(blankTask());
  setCrossDeptNeedsBoth(false);
  setCrossDeptCoAssignee('');
};
```

- [ ] **Step 4: Remove now-unused state variables from SocialMedia**

Remove these state declarations (lines ~98-115) that are now managed internally by TaskForm:

```js
// REMOVE:
const [crossDeptSubType, setCrossDeptSubType] = useState('');
const [crossDeptNeedsBoth, setCrossDeptNeedsBoth] = useState(false);
const [crossDeptCoAssignee, setCrossDeptCoAssignee] = useState('');
```

Also remove the derived variables:

```js
// REMOVE:
const isVideographyTarget = taskForm.targetDept === 'Videography/Photography';
const deptEmployees = employees.filter(...)
const crossDeptCoStaff = ...
```

Keep `rule` if it's used elsewhere. Check usage.

- [ ] **Step 5: Delete CrossDeptTaskModal.jsx**

```bash
rm src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 7: Commit**

```bash
git add src/components/Departments/SocialMedia.jsx src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx
git commit -m "refactor: replace SocialMedia CrossDeptTaskModal with shared TaskForm"
```

---

### Task 5: Wire DeptCalendar to use TaskForm

**Files:**
- Modify: `src/components/shared/DeptCalendar.jsx`

**Interfaces:**
- Consumes: `TaskForm` from `./TaskForm`
- Produces: same `handleAssignTask` logic (receives normalized task data from TaskForm)

- [ ] **Step 1: Import TaskForm**

Add after existing imports in `src/components/shared/DeptCalendar.jsx`:

```js
import TaskForm from './TaskForm';
```

- [ ] **Step 2: Replace inline modal form**

In `src/components/shared/DeptCalendar.jsx`, replace the entire cross-dept assign modal block (lines ~1132-1248, the `{showTaskModal && (...)}` block) with:

```jsx
{showTaskModal && (
  <Modal title="Assign Task to Another Department" onClose={() => { setShowTaskModal(false); setTaskForm(blankTask()); }} wide>
    <TaskForm
      sourceDept={deptName}
      targetDept={taskForm.targetDept}
      showDescription={true}
      showAssignee={true}
      showProject={false}
      onSubmit={handleAssignTask}
      onCancel={() => { setShowTaskModal(false); setTaskForm(blankTask()); }}
      employees={employees}
      tasks={tasks}
      currentUser={user}
    />
  </Modal>
)}
```

- [ ] **Step 3: Update `handleAssignTask` to receive normalized task data**

Replace the current `handleAssignTask` (lines ~624-705) with a version that receives `taskData` from TaskForm:

```jsx
const handleAssignTask = (taskData) => {
    const now = new Date().toISOString();

    updateState({ tasks: [...tasks, taskData] });

    // Notify assignee or whole target dept
    const toNotify = taskData.assignedTo
        ? [employees.find(e => e.id === taskData.assignedTo)].filter(Boolean)
        : employees.filter(e => e.department?.includes(taskData.department));
    const newNotifs = toNotify.map(emp => ({
        id: genId('NTF') + `_${emp.id}`,
        userId: emp.id,
        message: `📌 ${deptName} assigned you a task: "${taskData.title}"${taskData.dueDate ? ` — due ${taskData.dueDate}` : ''}`,
        type: 'assignment',
        timestamp: now,
        read: false,
    }));
    if (taskData.assignedTo2) {
        const co = employees.find(e => e.id === taskData.assignedTo2);
        if (co) {
            newNotifs.push({
                id: genId('NTF') + `_co_${taskData.assignedTo2}`,
                userId: taskData.assignedTo2,
                message: `📌 ${deptName} co-assigned you to a task: "${taskData.title}"${taskData.dueDate ? ` — due ${taskData.dueDate}` : ''}`,
                type: 'assignment',
                timestamp: now,
                read: false,
            });
        }
    }
    if (newNotifs.length) updateState({ notifications: [...notifications, ...newNotifs] });

    toast.success(`Task "${taskData.title}" assigned to ${taskData.department}.`);
    setShowTaskModal(false);
    setTaskForm(blankTask());
};
```

- [ ] **Step 4: Remove now-unused state variables from DeptCalendar**

Remove these declarations that are now managed internally by TaskForm:

```js
// REMOVE:
const [crossDeptSubType, setCrossDeptSubType] = useState('');
const [crossDeptNeedsBoth, setCrossDeptNeedsBoth] = useState(false);
const [crossDeptCoAssignee, setCrossDeptCoAssignee] = useState('');
```

Also remove the derived variables:

```js
// REMOVE:
const isVideographyTarget = taskForm.targetDept === 'Videography/Photography';
const targetDeptEmployees = employees.filter(...)
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/DeptCalendar.jsx
git commit -m "refactor: replace DeptCalendar inline form with shared TaskForm"
```

---

### Task 6: Final verification and cleanup

**Files:**
- Verify: all modified files
- Verify: `src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx` is deleted

**Interfaces:**
- Consumes: all previous tasks
- Produces: clean build, no lint errors in modified files

- [ ] **Step 1: Verify build passes**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: Verify lint passes for modified files**

Run: `npm run lint 2>&1 | Select-String "TaskForm|ManagerDashboard|SocialMedia|DeptCalendar"`
Expected: No new errors (pre-existing warnings ok)

- [ ] **Step 3: Verify CrossDeptTaskModal is deleted**

Run: `Test-Path src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx`
Expected: `False`

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup after unified task form refactor"
```

# Unified Task Assignment Module

## Problem

Task creation is duplicated across 3+ components (ManagerDashboard, SocialMedia's CrossDeptTaskModal, DeptCalendar), each producing slightly different task shapes (different ID prefixes, missing fields, inconsistent `sourceDept`). This makes maintenance painful and introduces subtle bugs when one flow is updated but others aren't.

## Goal

Extract a single shared `<TaskForm>` component used by ManagerDashboard, SocialMedia "Assign to Dept", and DeptCalendar. Normalize the task data shape so all callers produce consistent objects. Keep Creative.jsx, Projects.jsx, and calendar-linked auto-creation unchanged.

## Design

### Shared TaskForm Component

**Location:** `src/components/shared/TaskForm.jsx`

**Props:**

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `sourceDept` | string | required | Who is creating (e.g., "Social Media", "Work Assignment") |
| `targetDept` | string | `''` | Pre-selected target department |
| `showDescription` | boolean | `false` | Show description textarea |
| `showAssignee` | boolean | `true` | Show assignee picker |
| `showProject` | boolean | `true` | Show project selector |
| `onSubmit` | function | required | Called with complete task data object |
| `onCancel` | function | required | Close/reset handler |
| `employees` | array | required | Employee list for assignee pickers |
| `projects` | array | `[]` | Project list for project picker |
| `currentUser` | object | required | Current user for `assignedBy` |

**Internal state:** title, description, targetDept, assigneeId, coAssigneeId, priority, dueDate, timelineDays, scheduledDate, taskProject — all managed internally, reset on submit.

**Field visibility by context:**

| Field | ManagerDashboard | SocialMedia | DeptCalendar |
|-------|-----------------|-------------|--------------|
| Title | yes | yes | yes |
| Description | no | yes | yes |
| Target Dept | yes | yes | yes |
| Assignee | yes (required) | yes (optional) | yes (optional) |
| Co-Assignee | yes (Videography only) | yes (Videography only) | yes (Videography only) |
| Priority | yes | yes | yes |
| Due Date / Timeline | yes | yes | yes |
| Scheduled Date | yes (creative depts) | yes (creative depts) | yes (creative depts) |
| Project | yes | no | no |

**Normalized task output shape:**

```js
{
  id:                `T${Date.now()}`,
  title:             string,
  description:       string,          // empty string if showDescription=false
  assignedTo:        string | null,
  assigneeName:      string,
  assignedTo2:       string | null,
  assigneeName2:     string,
  assignedBy:        currentUser.id,
  department:        targetDept,
  sourceDept:        sourceDept prop,
  projectId:         string,          // from picker or 'General'
  priority:          string,
  status:            'New',
  dueDate:           string,          // computed by computeDueDate()
  scheduledDate:     string | null,
  createdAt:         ISO string,
  pinged:            0,
  lastPingedAt:      null,
  shootApprovalStatus: isVideography ? 'pending' : null,
}
```

### Caller Changes

**ManagerDashboard** (`src/components/ManagerDashboard.jsx`):
- Remove inline form fields (~lines 650-789)
- Replace with `<TaskForm sourceDept="Work Assignment" showDescription={false} showProject={true} showAssignee={true} ... />`
- `onSubmit` handler: creates notification + audit log + calls `updateState` (same logic, just receives normalized data)

**SocialMedia** (`src/components/Departments/SocialMedia.jsx`):
- Remove `<CrossDeptTaskModal>` import and usage
- Replace with `<TaskForm sourceDept="Social Media" showDescription={true} showProject={false} showAssignee={true} ... />`
- `onSubmit` handler: creates notification + calls `db.addTask()` (same logic)

**DeptCalendar** (`src/components/shared/DeptCalendar.jsx`):
- Replace inline form with `<TaskForm sourceDept={deptName} showDescription={true} showProject={false} showAssignee={true} ... />`
- `onSubmit` handler: same logic

### Files Changed

| File | Action |
|------|--------|
| `src/components/shared/TaskForm.jsx` | New — shared form component |
| `src/lib/constants.js` | Edit — add `DEPT_TIMELINE_RULES` (moved from ManagerDashboard) |
| `src/components/ManagerDashboard.jsx` | Edit — replace inline form with TaskForm, import rules from constants |
| `src/components/Departments/SocialMedia.jsx` | Edit — replace CrossDeptTaskModal with TaskForm |
| `src/components/shared/DeptCalendar.jsx` | Edit — replace inline form with TaskForm |
| `src/components/Departments/SocialMedia/CrossDeptTaskModal.jsx` | Delete — replaced by TaskForm |

### Unchanged

- `Creative.jsx` — keeps its own form (has `attachmentUrl`, `deadlineDaysPrior`)
- `Projects.jsx` — keeps its milestone form (minimal, different purpose)
- Calendar-linked task creation in SocialMedia — stays automated, normalize task shape to match
- All task rendering (TaskCard, filters, etc.) — reads same fields

### Workload Cap

TaskForm integrates the existing workload cap check (`getWorkloadInfo`) for creative departments. If the assignee exceeds capacity, show a toast warning/error before submit.

### computeDueDate

TaskForm imports `computeDueDate` from `src/lib/format.js` (already a shared utility). `DEPT_TIMELINE_RULES` is currently defined in ManagerDashboard — it should move to `src/lib/constants.js` so TaskForm can import it without depending on ManagerDashboard.

## Non-Goals

- Refactoring Creative.jsx or Projects.jsx task creation
- Changing calendar-linked auto-creation logic
- Changing task rendering, filters, or TaskCard
- Adding new fields beyond what already exists

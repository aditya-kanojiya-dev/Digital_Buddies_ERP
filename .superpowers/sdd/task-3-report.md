# Task 3 Report: Wire ManagerDashboard to shared TaskForm

## Status: DONE

## What Changed
- Added `import TaskForm from './shared/TaskForm'`
- Replaced the entire inline `<form>` block (title, dept, role type, both-roles toggle, assignee, project, co-assignee, priority, due date, scheduled date, submit button) with a single `<TaskForm>` component call
- Rewrote `handleCreateTask` to receive a complete `taskData` object from TaskForm instead of building it from individual state variables
- Cleaned up unused imports: `DatePicker`, `addDays`, `computeDueDate`, `getWorkloadInfo`, `formatWorkloadLabel`, `CREATIVE_DEPTS`, `DEPT_TIMELINE_RULES`

## State Variables Removed (now managed by TaskForm internally)
- `taskTitle`
- `assigneeId`
- `taskProject`
- `taskPriority`
- `taskDue`
- `timelineDays`
- `taskScheduledDate`
- `subTypeFilter`
- `needsBothRoles`
- `coAssigneeId`

## State Variables Kept
- `targetDept` — still needed by `deptStaff` (used in the metrics section at line ~750)

## Derived Variables Removed
- `rule` (DEPT_TIMELINE_RULES lookup)
- `isVideographyDept`
- `coDeptStaff`
- `isCreativeDept`

## Derived Variables Kept
- `deptStaff` — used in the Team Task Metrics section (line ~750). Simplified to remove `subTypeFilter` dependency (now shows all employees in the selected dept, which is correct for metrics display)

## Build Result
- `npm run build` passed successfully (548 modules, no errors)

## Concerns
- The `onCancel` callback now only resets `targetDept` to `''`. The original spec included resetting `subTypeFilter`, `needsBothRoles`, and `coAssigneeId`, but those states were removed since they're now managed internally by TaskForm. TaskForm does not currently reset its own state when `onCancel` is called — if a cancel-after-partial-fill flow is needed, TaskForm should expose a `reset()` ref or handle it internally.
- The `deptStaff` simplification means the metrics section shows all employees in the selected department regardless of videographer sub-type. This is arguably better for metrics (shows the full team), but differs from the old behavior where metrics filtered by sub-type when one was selected in the form.

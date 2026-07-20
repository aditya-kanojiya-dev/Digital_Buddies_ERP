# Task 2 Report — Shared TaskForm Component

**Status:** DONE

## What Was Created

- `src/components/shared/TaskForm.jsx` — 309-line shared form component with:
  - Target department selector (from `ALLOWED_TARGET_DEPTS`)
  - Role type filter + both-roles toggle (Videography/Photography)
  - Assignee picker with live workload cap coloring
  - Co-assignee support for dual-role tasks
  - Priority-driven due date computation (Emergency/select/manual/fixed modes)
  - Project selector, scheduled date (creative depts), description toggle
  - Full validation, workload cap enforcement, form reset on submit

## Build Result

```
vite v8.1.0 built in 786ms
✓ 547 modules transformed, no errors
```

Only pre-existing warning: `PersonalCalendar.jsx` dynamic/static import mismatch (unrelated).

## Concerns

None. All imports (`Toast`, `format`, `workloadCaps`, `constants`, `DatePicker`) already exist in the codebase. Component is ready for integration by ManagerDashboard, SocialMedia, and DeptCalendar.

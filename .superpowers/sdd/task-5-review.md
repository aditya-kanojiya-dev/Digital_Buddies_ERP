# Task 5 Review — DeptCalendar wiring

**VERDICT: APPROVED** (after fix)

The refactor is clean — 200 lines removed, all unused state/imports cleaned, build passes.

**Regression found and fixed:** TaskForm originally forced assignee selection (`required` attr + validation check), but old DeptCalendar allowed unassigned whole-department tasks. Fixed by:
1. Removed `required` from assignee `<select>`
2. Removed `if (showAssignee && !assigneeId)` validation check
3. Changed default option from "-- Select --" to "Whole department (unassigned)"

All three callers (ManagerDashboard, SocialMedia, DeptCalendar) now support unassigned tasks.

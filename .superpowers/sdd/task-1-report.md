# Task 1 — Shared Department Constants

**Status:** DONE

## Changes

- **`src/lib/constants.js`** — Added `ALLOWED_TARGET_DEPTS`, `CREATIVE_DEPTS`, and `DEPT_TIMELINE_RULES` as the single source of truth.
- **`src/components/ManagerDashboard.jsx`** — Removed local definitions (lines 13–22), added import from `../lib/constants`. No re-export needed; only SocialMedia.jsx imported these, and that import was updated.
- **`src/components/Departments/SocialMedia.jsx`** — Changed import source from `'../ManagerDashboard'` to `'../../lib/constants'`.

## Build Result

`npm run build` — ✅ success (870ms, no errors).

## Concerns

None. No logic changes, only moved definitions to shared imports.

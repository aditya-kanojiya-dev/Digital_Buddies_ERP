# Task 1 Review — Move department constants to src/lib/constants.js

## Spec compliance: PASS

- All three constants (ALLOWED_TARGET_DEPTS, CREATIVE_DEPTS, DEPT_TIMELINE_RULES) moved to `src/lib/constants.js` and exported.
- ManagerDashboard imports from `../lib/constants`.
- SocialMedia imports from `../../lib/constants`.
- No other files import these constants — no missed consumers.

## Code quality: APPROVED

- Definitions are byte-identical (values unchanged).
- No logic changes — diff is purely cut/paste + import updates.
- `constants.js` is a natural home for shared constants alongside existing ROLES.

## Task verdict: APPROVED

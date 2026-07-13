-- ============================================================================
-- Digital Buddies ERP — Phase 9: Fix Social Media employee permissions
-- ============================================================================
-- This migration is idempotent — safe to run multiple times.
--
-- 1. Ensures the task UPDATE policy allows the assigner (assigned_by) to
--    update tasks they created (supersedes Phase 2's assignee-only policy).
--    This was previously addressed in Phase 8 but may not have been applied.
--
-- 2. Allows the task creator/assigner to delete tasks they created,
--    so Social Media employees can clean up their own task assignments.
-- ============================================================================

-- ── 1. Task UPDATE: allow assigner to update ────────────────────────────────
-- Drop the old assignee-only policy if it still exists
DROP POLICY IF EXISTS "tasks: assignee updates own task status" ON tasks;
-- Drop the Phase 8 policy if it already exists (idempotent re-create)
DROP POLICY IF EXISTS "tasks: assignee or assigner can update" ON tasks;

CREATE POLICY "tasks: assignee or assigner can update"
  ON tasks FOR UPDATE
  USING (
       assigned_to = current_employee_id()
    OR assigned_by = current_employee_id()
  );

-- ── 2. Task DELETE: allow assigner to delete their own tasks ────────────────
-- Drop existing privileged delete policy, re-create with assigner access
DROP POLICY IF EXISTS "tasks: privileged delete" ON tasks;

CREATE POLICY "tasks: assigner can delete own tasks"
  ON tasks FOR DELETE
  USING (
       current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR')
    OR assigned_by = current_employee_id()
  );

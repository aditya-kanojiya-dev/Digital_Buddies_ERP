-- ============================================================================
-- Digital Buddies ERP — Phase 8: Fix task UPDATE RLS for assigner
-- ============================================================================
-- Problem:
--   The `tasks: assignee updates own task status` policy (Phase 2) only
--   allows the current assignee (assigned_to) to UPDATE a task.  The task
--   creator/assigner (assigned_by) — typically a Social Media employee who
--   assigns work to Creative — is blocked from reassigning the task or
--   changing its due date when editing a calendar post.
--
--   Since Social Media employees are not always Managers (who are already
--   allowed via the "privileged full update" policy), their task updates
--   silently failed due to RLS, making it appear as if the assignment
--   didn't "take".
--
-- Fix:
--   Expand the UPDATE policy to also include the task creator (assigned_by),
--   matching the already-existing SELECT policy (line 167) which grants
--   read access to both assignee and assigner.
-- ============================================================================

DROP POLICY IF EXISTS "tasks: assignee updates own task status" ON tasks;

CREATE POLICY "tasks: assignee or assigner can update"
  ON tasks FOR UPDATE
  USING (
       assigned_to = current_employee_id()
    OR assigned_by = current_employee_id()
  );

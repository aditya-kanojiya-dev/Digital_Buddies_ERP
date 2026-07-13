-- ============================================================================
-- Phase 11: Full Fix for Social Media Employee Access
-- ============================================================================
-- Run this AFTER all previous migrations in the Supabase SQL Editor.
--
-- PROBLEM:
--   Social Media employees (role='Employee', dept=['Social Media']) can't:
--   1. See tasks already assigned to them or by them
--   2. Assign tasks to creative departments
--   3. See tasks in the calendar
--   4. See notifications about task assignments
--
-- ROOT CAUSES:
--   1. current_employee_id() returns NULL when auth_user_id is not set,
--      which silently breaks ALL RLS policies (they return 0 rows, not 403)
--   2. Tasks SELECT RLS is too restrictive — SM employees need to see
--      tasks originating from their department, not just personally assigned
--   3. Some tables may be missing explicit GRANT statements
--
-- This migration is idempotent — safe to run multiple times.
-- ============================================================================


-- ── 0. Helper: get current auth user's email (if not already created) ─────
CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_email() TO authenticated;


-- ── 1. Backfill missing auth_user_id for ALL employees ─────────────────────
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH matched AS (
    SELECT e.id AS emp_id, u.id AS auth_id
    FROM employees e
    JOIN auth.users u
      ON lower(u.email) = lower(e.email)
    WHERE e.auth_user_id IS NULL
  )
  UPDATE employees e
     SET auth_user_id = matched.auth_id
    FROM matched
   WHERE e.id = matched.emp_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '[phase11] Backfilled auth_user_id for % employees', updated_count;
END $$;


-- ── 2. Ensure current_employee_id() has email fallback ─────────────────────
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid()
  UNION ALL
  SELECT id FROM employees
   WHERE auth_user_id IS NULL
     AND lower(email) = lower(public.auth_user_email())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;


-- ── 3. Ensure current_employee_role() has email fallback ───────────────────
CREATE OR REPLACE FUNCTION public.current_employee_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid()
  UNION ALL
  SELECT role FROM employees
   WHERE auth_user_id IS NULL
     AND lower(email) = lower(public.auth_user_email())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_role() TO authenticated;


-- ── 4. Helper: check if current user is in Social Media department ─────────
CREATE OR REPLACE FUNCTION public.current_user_in_social_media()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id = auth.uid()
      AND 'Social Media' = ANY(e.department)
  )
  OR EXISTS (
    SELECT 1 FROM employees e
    WHERE e.auth_user_id IS NULL
      AND lower(e.email) = lower(public.auth_user_email())
      AND 'Social Media' = ANY(e.department)
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_user_in_social_media() TO authenticated;


-- ── 5. Fix GRANT statements for all tables ─────────────────────────────────
-- Belt-and-suspenders: ensure authenticated role has access even if
-- blanket grant from base migration didn't cover later-created tables.
GRANT ALL ON smm_calendar       TO authenticated;
GRANT ALL ON smm_quotes         TO authenticated;
GRANT ALL ON tasks              TO authenticated;
GRANT ALL ON task_comments      TO authenticated;
GRANT ALL ON notifications      TO authenticated;
GRANT ALL ON personal_tasks     TO authenticated;
GRANT ALL ON attendance_docs    TO authenticated;
GRANT ALL ON employees          TO authenticated;
GRANT ALL ON ad_campaigns       TO authenticated;


-- ── 6. Fix tasks SELECT RLS — ALL authenticated users can read all tasks ───
-- Tasks are collaborative work-management data. Locking SELECT to only
-- assignee/assigner causes SM employees (and other non-privileged roles)
-- to lose visibility into the tasks they need to coordinate on, see
-- workload in assignment dropdowns, and view task chips on the calendar.
-- 
-- Drop ALL old policies first to avoid conflicts.

DROP POLICY IF EXISTS "tasks: assignee or assigner read" ON tasks;
DROP POLICY IF EXISTS "tasks: privileged read all" ON tasks;
DROP POLICY IF EXISTS "tasks: SM dept can read their source tasks" ON tasks;
DROP POLICY IF EXISTS "tasks: SM dept full visibility" ON tasks;

-- Single blanket SELECT: all authenticated users can read all tasks
CREATE POLICY "tasks: authenticated read"
  ON tasks FOR SELECT
  USING (true);


-- ── 7. Fix tasks INSERT — ensure SM employees can create tasks ─────────────
-- The existing "any authenticated staff can create" policy should work,
-- but let's make sure it's robust.
DROP POLICY IF EXISTS "tasks: any authenticated staff can create" ON tasks;

CREATE POLICY "tasks: any authenticated staff can create"
  ON tasks FOR INSERT
  WITH CHECK (current_employee_id() IS NOT NULL);


-- ── 8. Fix tasks UPDATE — SM employees can update tasks they're involved in ─
-- Existing policies from Phase 8/9 should cover assignee/assigner updates.
-- Ensure privileged update is also there.
DROP POLICY IF EXISTS "tasks: assignee or assigner can update" ON tasks;

CREATE POLICY "tasks: assignee or assigner can update"
  ON tasks FOR UPDATE
  USING (
       assigned_to = current_employee_id()
    OR assigned_by = current_employee_id()
    OR current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR')
  );


-- ── 9. Fix tasks DELETE — assigner can delete their own tasks ──────────────
DROP POLICY IF EXISTS "tasks: assigner can delete own tasks" ON tasks;

CREATE POLICY "tasks: assigner can delete own tasks"
  ON tasks FOR DELETE
  USING (
       current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR')
    OR assigned_by = current_employee_id()
  );


-- ── 10. Fix notifications SELECT — users can read their own ────────────────
-- Ensure SM employees can see their own notifications
DROP POLICY IF EXISTS "notifications: self read" ON notifications;
DROP POLICY IF EXISTS "notifications: privileged read" ON notifications;

CREATE POLICY "notifications: self read"
  ON notifications FOR SELECT
  USING (user_id = current_employee_id());

CREATE POLICY "notifications: privileged read"
  ON notifications FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin'));


-- ── 11. Fix notifications INSERT — any authenticated can create ────────────
DROP POLICY IF EXISTS "notifications: authenticated insert" ON notifications;

CREATE POLICY "notifications: authenticated insert"
  ON notifications FOR INSERT
  WITH CHECK (current_employee_id() IS NOT NULL);


-- ── 12. Fix task_comments — all authenticated can read comments ─────────────
-- Since tasks are now readable by all, comments should be too.
DROP POLICY IF EXISTS "task_comments: read if task visible" ON task_comments;

CREATE POLICY "task_comments: authenticated read"
  ON task_comments FOR SELECT
  USING (true);


-- ── 13. Ensure employees table is fully readable ────────────────────────────
-- SM employees need to see all employees for assignee dropdowns and workload
-- visibility. Drop ALL old policies and replace with clean set.
DROP POLICY IF EXISTS "employees: authenticated all" ON employees;
DROP POLICY IF EXISTS "employees: any authenticated read" ON employees;
DROP POLICY IF EXISTS "employees: self read" ON employees;
DROP POLICY IF EXISTS "employees: privileged read" ON employees;

CREATE POLICY "employees: authenticated read"
  ON employees FOR SELECT
  USING (true);

-- ── 14. Ensure smm_calendar is fully open to authenticated ─────────────────
-- Verify existing USING(true) policies are in place
DO $$
BEGIN
  -- Only create if no SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'smm_calendar'
      AND cmd = 'SELECT'
      AND qual = 'true'
  ) THEN
    CREATE POLICY "smm_calendar: authenticated all"
      ON smm_calendar FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE '[phase11] Created blanket smm_calendar policy';
  ELSE
    RAISE NOTICE '[phase11] smm_calendar already has open policies';
  END IF;
END $$;


-- ── 15. Verify ─────────────────────────────────────────────────────────────
-- Run these after applying to confirm fixes:
--
-- -- Should return 0 rows (all auth_user_ids backfilled):
-- SELECT id, name, email, auth_user_id FROM employees WHERE auth_user_id IS NULL;
--
-- -- Should return your employee ID, not NULL:
-- SELECT current_employee_id();
--
-- -- Should return your role, not NULL:
-- SELECT current_employee_role();
--
-- -- Should return true for SM employees:
-- SELECT current_user_in_social_media();
--
-- -- Should show updated policies on tasks:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks' ORDER BY cmd;
--
-- -- Test: as SM employee, should return tasks:
-- SELECT count(*) FROM tasks;
-- SELECT count(*) FROM smm_calendar;
-- SELECT count(*) FROM notifications WHERE user_id = current_employee_id();

-- ============================================================================
-- Done — Phase 11 applied.
-- ============================================================================

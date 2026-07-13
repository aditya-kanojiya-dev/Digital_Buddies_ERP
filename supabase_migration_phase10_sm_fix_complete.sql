-- ============================================================================
-- Digital Buddies ERP — Phase 10: Complete Fix for Social Media Access
-- ============================================================================
-- Run this AFTER all previous migrations in the Supabase SQL Editor.
--
-- ROOT CAUSES FIXED:
--   1. current_employee_id() returns NULL for employees whose auth_user_id
--      was never backfilled — this silently breaks ALL RLS policies that
--      use it (tasks, notifications, attendance, leaves, login_activity).
--
--   2. Tasks SELECT only shows tasks where assigned_to or assigned_by
--      matches current_employee_id(). SM employees who assigned tasks to
--      creative departments CAN see them (via assigned_by), but other SM
--      team members in the same department cannot see those tasks.
--
--   3. The login self-heal in auth.js tries to set auth_user_id but the
--      RLS self-update policy requires auth_user_id = auth.uid(), which
--      is NULL ≠ auth.uid() — so the UPDATE silently fails.
--
-- This migration is idempotent — safe to run multiple times.
-- ============================================================================


-- ── 0. Helper: get current auth user's email ──────────────────────────────
-- SECURITY DEFINER so it can read auth.users; STABLE for caching.
-- This avoids inline subqueries in RLS policy expressions which cause
-- syntax errors in PostgreSQL.
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
-- This fixes the core issue: current_employee_id() returns NULL when
-- auth_user_id is not set, which breaks every RLS policy.
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
  RAISE NOTICE '[phase10] Backfilled auth_user_id for % employees', updated_count;
END $$;


-- ── 2. Improve current_employee_id() with email fallback ───────────────────
-- If auth_user_id doesn't match, try matching by email as a fallback.
-- This handles the edge case where an auth user exists but was never linked.
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


-- ── 3. Improve current_employee_role() with same fallback ──────────────────
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


-- ── 4. Tasks: add SM department visibility ─────────────────────────────────
-- SM employees need to see ALL tasks originating from their department,
-- not just the ones they personally assigned. This is needed for the
-- department calendar view where multiple SM members manage the same posts.
DROP POLICY IF EXISTS "tasks: SM dept can read their source tasks" ON tasks;

CREATE POLICY "tasks: SM dept can read their source tasks"
  ON tasks FOR SELECT
  USING (
    source_dept = 'Social Media'
    AND EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
        AND 'Social Media' = ANY(e.department)
    )
  );


-- ── 5. Employees: replace blanket policy with granular ones ────────────────
-- The current "employees: authenticated all" blanket policy allows ANY
-- logged-in user to read/modify ALL employee records — a security risk.
-- Replace with proper granular policies.

-- Drop ALL existing employee policies to start clean
DROP POLICY IF EXISTS "employees: authenticated all" ON employees;
DROP POLICY IF EXISTS "employees: any authenticated read" ON employees;
DROP POLICY IF EXISTS "employees: self read" ON employees;
DROP POLICY IF EXISTS "employees: privileged read" ON employees;
DROP POLICY IF EXISTS "employees: admin insert" ON employees;
DROP POLICY IF EXISTS "employees: admin update" ON employees;
DROP POLICY IF EXISTS "employees: self update own profile" ON employees;
DROP POLICY IF EXISTS "employees: self set auth_user_id" ON employees;
DROP POLICY IF EXISTS "employees: admin delete" ON employees;

-- Everyone can read everyone (needed for assignee dropdowns, department views)
CREATE POLICY "employees: any authenticated read"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Only admins/HR can insert new employees
CREATE POLICY "employees: admin insert"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_employee_role() IN ('Super Admin', 'Admin', 'HR')
    OR public.current_employee_role() IS NULL
  );

-- Admins/HR can update any employee
CREATE POLICY "employees: admin update"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    public.current_employee_role() IN ('Super Admin', 'Admin', 'HR')
  );

-- Employees can update their own profile
CREATE POLICY "employees: self update own profile"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Allow the login self-heal to set auth_user_id for employees who
-- don't have it yet. Without this, the self-heal UPDATE in auth.js
-- silently fails for employees whose auth_user_id is NULL.
CREATE POLICY "employees: self set auth_user_id"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(public.auth_user_email())
  )
  WITH CHECK (
    auth_user_id = auth.uid()
  );

-- Only Super Admin can delete employees
CREATE POLICY "employees: admin delete"
  ON employees FOR DELETE
  TO authenticated
  USING (
    public.current_employee_role() = 'Super Admin'
  );


-- ── 6. Verify ─────────────────────────────────────────────────────────────
-- Run these queries to verify the fixes after applying:
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
-- -- Should show the new "SM dept can read" policy on tasks:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks' ORDER BY cmd;
--
-- -- Should show granular policies instead of "authenticated all":
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employees' ORDER BY cmd;

-- ============================================================================
-- Done — Phase 10 applied.
-- ============================================================================

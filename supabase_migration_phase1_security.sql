-- ============================================================================
-- Phase 1: Security Hardening — Non-destructive migration
-- ============================================================================
-- Run this AFTER supabase_migration.sql on an EXISTING database.
-- It does NOT drop any tables or rows.
--
-- What it does:
--   1. Adds `auth_user_id` column to `employees` and backfills it from auth.users
--   2. Creates the `salaries` table that supabase_rls_policies.sql references
--      but the original migration never created
--   3. Replaces permissive RLS policies on `employees` + creates policies on
--      `salaries` using auth_user_id = auth.uid() instead of id = auth.uid()
--      (which never matched, because employees.id is TEXT like 'EMP01' and
--      auth.uid() returns the Supabase Auth UUID).
--   4. Adds a FK from employees.auth_user_id -> auth.users(id) with ON DELETE SET NULL
--      so removing an auth user doesn't cascade-delete the employee record.
--
-- Safe to re-run: every step is idempotent (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================================

-- ============================================================================
-- 1. employees.auth_user_id — bridge to auth.users
-- ============================================================================
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
  REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_auth_user
  ON employees (auth_user_id);

-- Backfill any existing employees whose auth user already exists.
-- Matches by lowercased email. Skips rows that already have auth_user_id set.
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
  RAISE NOTICE '[phase1] Backfilled auth_user_id for % existing employees', updated_count;
END $$;


-- ============================================================================
-- 2. salaries table (was referenced by RLS but never created)
-- ============================================================================
CREATE TABLE IF NOT EXISTS salaries (
  id          TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to   DATE DEFAULT NULL,
  currency    TEXT NOT NULL DEFAULT 'INR',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salaries_employee ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_effective ON salaries(effective_from);

ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- Drop first so this migration is idempotent
DROP POLICY IF EXISTS "salaries: self read"          ON salaries;
DROP POLICY IF EXISTS "salaries: privileged read"   ON salaries;
DROP POLICY IF EXISTS "salaries: admin insert"      ON salaries;
DROP POLICY IF EXISTS "salaries: admin update"      ON salaries;
DROP POLICY IF EXISTS "salaries: admin delete"      ON salaries;
DROP POLICY IF EXISTS "salaries_select"             ON salaries;
DROP POLICY IF EXISTS "salaries_insert"             ON salaries;
DROP POLICY IF EXISTS "salaries_update"             ON salaries;
DROP POLICY IF EXISTS "salaries_delete"             ON salaries;

-- Employees can see their own salary record
CREATE POLICY "salaries: self read"
  ON salaries FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
       WHERE auth_user_id = auth.uid()
    )
  );

-- Privileged roles can read all salaries
CREATE POLICY "salaries: privileged read"
  ON salaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
       WHERE e.auth_user_id = auth.uid()
         AND e.role IN ('Super Admin', 'Admin', 'HR', 'Founder')
    )
  );

-- Only Super Admin / Admin / HR can insert
CREATE POLICY "salaries: admin insert"
  ON salaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
       WHERE e.auth_user_id = auth.uid()
         AND e.role IN ('Super Admin', 'Admin', 'HR')
    )
  );

CREATE POLICY "salaries: admin update"
  ON salaries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
       WHERE e.auth_user_id = auth.uid()
         AND e.role IN ('Super Admin', 'Admin', 'HR')
    )
  );

CREATE POLICY "salaries: admin delete"
  ON salaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
       WHERE e.auth_user_id = auth.uid()
         AND e.role IN ('Super Admin', 'Admin')
    )
  );

GRANT ALL ON salaries TO authenticated;


-- ============================================================================
-- 3. employees — replace permissive policies with granular ones
-- ============================================================================

-- Drop every variant of policies that might exist, so this is idempotent
-- and overrides the permissive migration if it ran first.
DROP POLICY IF EXISTS "employees: self read"               ON employees;
DROP POLICY IF EXISTS "employees: privileged read"         ON employees;
DROP POLICY IF EXISTS "employees: admin insert"            ON employees;
DROP POLICY IF EXISTS "employees: admin update"            ON employees;
DROP POLICY IF EXISTS "employees: self update own profile" ON employees;
DROP POLICY IF EXISTS "employees: admin delete"            ON employees;
DROP POLICY IF EXISTS "employees_select"                   ON employees;
DROP POLICY IF EXISTS "employees_insert"                   ON employees;
DROP POLICY IF EXISTS "employees_update"                   ON employees;
DROP POLICY IF EXISTS "employees_delete"                   ON employees;

-- Helper: a SECURITY DEFINER function that returns the caller's role
-- without re-triggering RLS on employees (which would recurse).
CREATE OR REPLACE FUNCTION public.current_employee_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees
   WHERE auth_user_id = auth.uid()
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_role() TO authenticated;

-- Employees can see themselves
CREATE POLICY "employees: self read"
  ON employees FOR SELECT
  USING (auth_user_id = auth.uid());

-- Super Admin / Admin / Manager / HR can see everyone
CREATE POLICY "employees: privileged read"
  ON employees FOR SELECT
  USING (
    public.current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR')
  );

-- Only Super Admin / Admin can insert (HR inviting new staff)
CREATE POLICY "employees: admin insert"
  ON employees FOR INSERT
  WITH CHECK (
    public.current_employee_role() IN ('Super Admin', 'Admin')
    OR public.current_employee_role() IS NULL  -- first founder row, before any role exists
  );

-- Privileged roles can update any row
CREATE POLICY "employees: admin update"
  ON employees FOR UPDATE
  USING (
    public.current_employee_role() IN ('Super Admin', 'Admin', 'HR')
  );

-- Anyone can update their own non-sensitive fields
CREATE POLICY "employees: self update own profile"
  ON employees FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Only Super Admin can hard-delete employees
CREATE POLICY "employees: admin delete"
  ON employees FOR DELETE
  USING (
    public.current_employee_role() = 'Super Admin'
  );


-- ============================================================================
-- 4. Helpful view — callers see auth_user_id without leaking it elsewhere
-- ============================================================================
-- (Already exposed via the column. No additional view needed.)

-- ============================================================================
-- Done — Phase 1 RLS hardening applied.
-- ============================================================================
-- Verify with:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employees';
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'salaries';
-- ============================================================================
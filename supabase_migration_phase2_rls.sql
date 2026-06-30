-- ============================================================================
-- Phase 2: RLS Lockdown — confidential tables
-- ============================================================================
-- Run this AFTER:
--   1. supabase_migration.sql            (creates tables + permissive policies)
--   2. supabase_migration_phase1_security.sql  (employees.auth_user_id + employees/salaries RLS + current_employee_role())
--
-- This migration is NON-DESTRUCTIVE (no DROP TABLE, no data changes) and
-- IDEMPOTENT (safe to re-run — every policy is DROP IF EXISTS then CREATE).
--
-- ──────────────────────────────────────────────────────────────────────────
-- WHY ONLY THESE 13 TABLES?
-- ──────────────────────────────────────────────────────────────────────────
-- The original migration gave all 24 tables a permissive `USING (true)` policy,
-- meaning any authenticated employee could read every row (all salaries,
-- invoices, leaves, login history, invite tokens, etc.). This migration locks
-- down the CONFIDENTIAL tables.
--
-- The 10 SHARED-OPERATIONAL tables (tasks, task_comments, projects, clients,
-- smm_calendar, smm_quotes, ad_stats, client_feedback, daily_ops, dev_projects)
-- intentionally KEEP their authenticated read+write policies. They are
-- low-sensitivity collaborative data, AND the app persists them via
-- db.js `saveTable()` which does a bulk UPSERT + orphan-DELETE of the *entire*
-- array. Restricting their write scope to a per-user subset while every role
-- still reads the full set would make the orphan-DELETE wipe rows the writer
-- can't see. Tightening them safely requires migrating db.js to per-row writes
-- (planned for Phase 4). Until then they remain shared by design.
--
-- ──────────────────────────────────────────────────────────────────────────
-- DATA-LOSS SAFETY (important)
-- ──────────────────────────────────────────────────────────────────────────
-- `saveTable()` deletes DB rows whose id is not in the array it was given.
-- For the OWNER-SCOPED tables below, READ and WRITE are scoped to the SAME set
-- (own rows OR privileged-all), so the orphan-DELETE is RLS-bounded to rows the
-- caller is allowed to delete — a regular employee saving their own subset can
-- only ever delete their own orphans, never another employee's rows.
-- For the PRIVILEGED-ONLY tables, non-privileged users read an EMPTY set, and
-- saveTable() has an empty-array guard that skips the write entirely — so they
-- can never trigger an orphan-DELETE either.
-- ============================================================================


-- ============================================================================
-- 0. Helper functions (SECURITY DEFINER — bypass RLS to avoid recursion)
-- ============================================================================

-- Caller's employee role. Recreated defensively (also defined in phase 1).
CREATE OR REPLACE FUNCTION public.current_employee_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Caller's TEXT employee id (e.g. 'EMP01'). Used to match owner columns that
-- store the employee id rather than the auth UUID.
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Privileged = can see across all employees.
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR');
$$;

GRANT EXECUTE ON FUNCTION public.current_employee_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged()         TO authenticated;


-- ============================================================================
-- 1. PRIVILEGED-ONLY tables  (read + write restricted to SA/Admin/Manager/HR)
--    Tables: invoices, proposals, leads, interviews, moms, employee_invites
--    Non-privileged users read NOTHING (empty-array guard protects writes).
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  privileged_tables TEXT[] := ARRAY[
    'invoices', 'proposals', 'leads', 'interviews', 'moms', 'employee_invites'
  ];
BEGIN
  FOREACH t IN ARRAY privileged_tables LOOP
    -- Drop the permissive policies from supabase_migration.sql + any prior run.
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_priv_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_priv_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_priv_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_priv_delete', t);

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (public.is_privileged())',
      t || '_priv_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (public.is_privileged())',
      t || '_priv_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (public.is_privileged()) WITH CHECK (public.is_privileged())',
      t || '_priv_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (public.is_privileged())',
      t || '_priv_delete', t);
  END LOOP;
END $$;


-- ============================================================================
-- 2. OWNER-SCOPED personal tables  (self OR privileged, for BOTH read + write)
--    Owner column = employee_id (TEXT employee id like 'EMP01')
--    Tables: timelogs, attendance, leaves, advances, login_activity
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  owner_tables TEXT[] := ARRAY[
    'timelogs', 'attendance', 'leaves', 'advances', 'login_activity'
  ];
BEGIN
  FOREACH t IN ARRAY owner_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_delete', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_own_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_own_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_own_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_own_delete', t);
    -- Drop the older granular timelogs policies from supabase_rls_policies.sql
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': self read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': self insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': self update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': privileged read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ': admin delete', t);

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (employee_id = public.current_employee_id() OR public.is_privileged())',
      t || '_own_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (employee_id = public.current_employee_id() OR public.is_privileged())',
      t || '_own_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (employee_id = public.current_employee_id() OR public.is_privileged()) WITH CHECK (employee_id = public.current_employee_id() OR public.is_privileged())',
      t || '_own_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (employee_id = public.current_employee_id() OR public.is_privileged())',
      t || '_own_delete', t);
  END LOOP;
END $$;


-- ============================================================================
-- 3. NOTIFICATIONS  (owner = user_id; cross-user INSERT allowed)
-- ============================================================================
-- INSERT is open to any authenticated user because assignments / pings /
-- deadline alerts create a notification addressed to ANOTHER employee.
-- READ / UPDATE (mark read) / DELETE are restricted to the recipient or a
-- privileged role.

DROP POLICY IF EXISTS "notifications_select"      ON notifications;
DROP POLICY IF EXISTS "notifications_insert"      ON notifications;
DROP POLICY IF EXISTS "notifications_update"      ON notifications;
DROP POLICY IF EXISTS "notifications_delete"      ON notifications;
DROP POLICY IF EXISTS "notifications_own_select"  ON notifications;
DROP POLICY IF EXISTS "notifications_any_insert"  ON notifications;
DROP POLICY IF EXISTS "notifications_own_update"  ON notifications;
DROP POLICY IF EXISTS "notifications_own_delete"  ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = public.current_employee_id() OR public.is_privileged());
CREATE POLICY "notifications_any_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notifications_own_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = public.current_employee_id() OR public.is_privileged())
  WITH CHECK (user_id = public.current_employee_id() OR public.is_privileged());
CREATE POLICY "notifications_own_delete" ON notifications FOR DELETE TO authenticated
  USING (user_id = public.current_employee_id() OR public.is_privileged());


-- ============================================================================
-- 4. AUDIT_LOGS  (privileged read; append-only insert by any authenticated)
-- ============================================================================
DROP POLICY IF EXISTS "audit_logs_select"      ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"      ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update"      ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete"      ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_priv_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_any_insert"  ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_priv_update" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_priv_delete" ON audit_logs;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_priv_select" ON audit_logs FOR SELECT TO authenticated
  USING (public.is_privileged());
CREATE POLICY "audit_logs_any_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');
-- UPDATE/DELETE only privileged, so saveTable()'s upsert+orphan-delete still
-- works when a privileged user persists the full audit array.
CREATE POLICY "audit_logs_priv_update" ON audit_logs FOR UPDATE TO authenticated
  USING (public.is_privileged()) WITH CHECK (public.is_privileged());
CREATE POLICY "audit_logs_priv_delete" ON audit_logs FOR DELETE TO authenticated
  USING (public.is_privileged());


-- ============================================================================
-- DONE.  Verify with:
-- ============================================================================
--   SELECT tablename, policyname, cmd
--     FROM pg_policies
--    WHERE schemaname = 'public'
--      AND tablename IN ('invoices','proposals','leads','interviews','moms',
--                        'employee_invites','timelogs','attendance','leaves',
--                        'advances','login_activity','notifications','audit_logs')
--    ORDER BY tablename, cmd;
--
-- Manual check: log in as a regular Employee, then in the browser console run
--   await supabase.from('invoices').select('*')   -> should return []
--   await supabase.from('salaries').select('*')   -> should return [] (or own)
-- Log in as Super Admin -> both return all rows.
-- ============================================================================

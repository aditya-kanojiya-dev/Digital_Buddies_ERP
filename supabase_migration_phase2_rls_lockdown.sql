-- ============================================================================
-- NEO_MAX — Phase 2: RLS Lockdown
-- Run this AFTER supabase_migration.sql, supabase_rls_policies.sql, and
-- supabase_migration_phase1_security.sql (this file depends on the
-- employees.auth_user_id column that phase1 adds).
--
-- WHY THIS FILE EXISTS:
--   supabase_migration.sql enables RLS on every table, but grants every
--   authenticated user `USING (true)` on SELECT/INSERT/UPDATE/DELETE for ALL
--   of them. Postgres RLS policies are OR'd together — so even after
--   phase1 added scoped policies for employees/salaries, the original
--   "allow everyone everything" policies from the migration are still
--   active in parallel and silently defeat them on every other table.
--   Net effect today: any logged-in employee can read or write any other
--   employee's leave requests, attendance, pay advances, private
--   notifications, audit logs, and unredeemed invite tokens.
--
--   This file DROPs those blanket policies on the genuinely sensitive
--   tables and replaces them with ownership/role-scoped ones, using the
--   auth_user_id bridge column (employees.id is a TEXT business key like
--   'EMP01' and is never equal to auth.uid(), which is a UUID).
--
--   Shared operational tables (clients, leads, proposals, invoices,
--   smm_calendar, ad_stats, dev_projects, daily_ops, moms,
--   client_feedback, interviews) are intentionally left as "any
--   authenticated staff member" since that's the existing collaborative
--   model for those modules — tighten those per-department once
--   role-based write rules are defined for them specifically.
--
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================================

-- ── Helper: resolve the calling user's employees.id from their auth UUID ───
-- SECURITY DEFINER so it can read employees regardless of the caller's own
-- RLS visibility into that table; STABLE so Postgres can cache it per query.
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION current_employee_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid()
$$;


-- ── timelogs / projects ──────────────────────────────────────────────────────
-- (employees is already handled by supabase_migration_phase1_security.sql)
DROP POLICY IF EXISTS "timelogs_select" ON timelogs;
DROP POLICY IF EXISTS "timelogs_insert" ON timelogs;
DROP POLICY IF EXISTS "timelogs_update" ON timelogs;
DROP POLICY IF EXISTS "timelogs_delete" ON timelogs;

DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;


-- ── attendance ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
DROP POLICY IF EXISTS "attendance_update" ON attendance;
DROP POLICY IF EXISTS "attendance_delete" ON attendance;

CREATE POLICY "attendance: self read"
  ON attendance FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "attendance: privileged read"
  ON attendance FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "attendance: self insert own clock-in"
  ON attendance FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

CREATE POLICY "attendance: self update own record"
  ON attendance FOR UPDATE
  USING (employee_id = current_employee_id());

CREATE POLICY "attendance: privileged write"
  ON attendance FOR UPDATE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "attendance: privileged delete"
  ON attendance FOR DELETE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));


-- ── leaves ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaves_select" ON leaves;
DROP POLICY IF EXISTS "leaves_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_update" ON leaves;
DROP POLICY IF EXISTS "leaves_delete" ON leaves;

CREATE POLICY "leaves: self read"
  ON leaves FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "leaves: privileged read"
  ON leaves FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "leaves: self request own leave"
  ON leaves FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

CREATE POLICY "leaves: self edit own pending request"
  ON leaves FOR UPDATE
  USING (employee_id = current_employee_id() AND status = 'Pending');

CREATE POLICY "leaves: privileged approve/edit"
  ON leaves FOR UPDATE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "leaves: privileged delete"
  ON leaves FOR DELETE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));


-- ── advances (pay advances — financial, self + HR only) ────────────────────
DROP POLICY IF EXISTS "advances_select" ON advances;
DROP POLICY IF EXISTS "advances_insert" ON advances;
DROP POLICY IF EXISTS "advances_update" ON advances;
DROP POLICY IF EXISTS "advances_delete" ON advances;

CREATE POLICY "advances: self read"
  ON advances FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "advances: privileged read"
  ON advances FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "advances: self request own advance"
  ON advances FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

CREATE POLICY "advances: privileged write"
  ON advances FOR UPDATE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "advances: privileged delete"
  ON advances FOR DELETE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));


-- ── tasks ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks: assignee or assigner read"
  ON tasks FOR SELECT
  USING (assigned_to = current_employee_id() OR assigned_by = current_employee_id());

CREATE POLICY "tasks: privileged read all"
  ON tasks FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "tasks: any authenticated staff can create"
  ON tasks FOR INSERT
  WITH CHECK (current_employee_id() IS NOT NULL);

CREATE POLICY "tasks: assignee updates own task status"
  ON tasks FOR UPDATE
  USING (assigned_to = current_employee_id());

CREATE POLICY "tasks: privileged full update"
  ON tasks FOR UPDATE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "tasks: privileged delete"
  ON tasks FOR DELETE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));


-- ── task_comments ────────────────────────────────────────────────────────────
-- Comments are visible to anyone who can see the parent task; only the
-- comment's author (or a privileged role) can edit/delete it.
DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON task_comments;

CREATE POLICY "task_comments: read if task visible"
  ON task_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
      AND (
        t.assigned_to = current_employee_id()
        OR t.assigned_by = current_employee_id()
        OR current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR')
      )
  ));

CREATE POLICY "task_comments: author insert"
  ON task_comments FOR INSERT
  WITH CHECK (user_id = current_employee_id());

CREATE POLICY "task_comments: author or privileged update"
  ON task_comments FOR UPDATE
  USING (user_id = current_employee_id() OR current_employee_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "task_comments: author or privileged delete"
  ON task_comments FOR DELETE
  USING (user_id = current_employee_id() OR current_employee_role() IN ('Super Admin', 'Admin'));


-- ── notifications (personal inbox) ──────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY "notifications: self read"
  ON notifications FOR SELECT
  USING (user_id = current_employee_id());

CREATE POLICY "notifications: privileged read"
  ON notifications FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin'));

-- Any authenticated user can create a notification FOR someone else
-- (e.g. assigning a task pings the assignee) — mirrors existing app
-- behavior where the deadline engine / assigner writes on the
-- recipient's behalf.
CREATE POLICY "notifications: authenticated insert"
  ON notifications FOR INSERT
  WITH CHECK (current_employee_id() IS NOT NULL);

CREATE POLICY "notifications: self mark read"
  ON notifications FOR UPDATE
  USING (user_id = current_employee_id());

CREATE POLICY "notifications: self delete own"
  ON notifications FOR DELETE
  USING (user_id = current_employee_id());


-- ── login_activity ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "login_activity_select" ON login_activity;
DROP POLICY IF EXISTS "login_activity_insert" ON login_activity;
DROP POLICY IF EXISTS "login_activity_update" ON login_activity;
DROP POLICY IF EXISTS "login_activity_delete" ON login_activity;

CREATE POLICY "login_activity: self read"
  ON login_activity FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "login_activity: privileged read"
  ON login_activity FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "login_activity: self insert own session"
  ON login_activity FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

CREATE POLICY "login_activity: self update own session (logout)"
  ON login_activity FOR UPDATE
  USING (employee_id = current_employee_id());

-- No DELETE policy — login history is append-only / immutable by design.


-- ── audit_logs (immutable system trail) ─────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;

CREATE POLICY "audit_logs: privileged read"
  ON audit_logs FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'Manager', 'HR'));

CREATE POLICY "audit_logs: authenticated insert"
  ON audit_logs FOR INSERT
  WITH CHECK (current_employee_id() IS NOT NULL);

-- No UPDATE policy — audit entries must never be editable.

CREATE POLICY "audit_logs: super admin delete"
  ON audit_logs FOR DELETE
  USING (current_employee_role() = 'Super Admin');


-- ── employee_invites (contains unredeemed onboarding tokens) ───────────────
-- These are issued/consumed via a service-role Edge Function
-- (supabase/functions/send-welcome-email, validate-invite, and the
-- invite-accept callEdge() flow in AcceptInvite.jsx) which bypasses RLS
-- entirely. Client-side access is locked to admins/HR only — the
-- invite-accept page never needs to read this table directly.
DROP POLICY IF EXISTS "employee_invites_select" ON employee_invites;
DROP POLICY IF EXISTS "employee_invites_insert" ON employee_invites;
DROP POLICY IF EXISTS "employee_invites_update" ON employee_invites;
DROP POLICY IF EXISTS "employee_invites_delete" ON employee_invites;

CREATE POLICY "employee_invites: privileged read"
  ON employee_invites FOR SELECT
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "employee_invites: privileged insert"
  ON employee_invites FOR INSERT
  WITH CHECK (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "employee_invites: privileged update"
  ON employee_invites FOR UPDATE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

CREATE POLICY "employee_invites: privileged delete"
  ON employee_invites FOR DELETE
  USING (current_employee_role() IN ('Super Admin', 'Admin', 'HR'));

-- ============================================================================
-- VERIFY: after running, confirm no sensitive table still has a leftover
-- "USING (true)" blanket policy:
--
--   SELECT schemaname, tablename, policyname, qual
--   FROM pg_policies
--   WHERE qual = 'true' AND schemaname = 'public';
--
-- Expect this to return ONLY the intentionally-open operational tables
-- (clients, ad_stats, smm_calendar, smm_quotes, dev_projects, interviews,
-- client_feedback, daily_ops, leads, proposals, invoices, moms).
-- ============================================================================

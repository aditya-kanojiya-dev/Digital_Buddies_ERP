-- ============================================================================
-- Digital Buddies ERP — Supabase Migration
-- Generated: 2026-06-25
-- ============================================================================
-- This script:
--   1. Drops ALL existing tables (CASCADE)
--   2. Creates every table with snake_case columns
--   3. Enables RLS on every table
--   4. Adds permissive RLS policies for the "authenticated" role
--   5. GRANTs full access to "authenticated"
--   6. Creates performance indexes
-- ============================================================================

-- ============================================================================
-- 0. DROP ALL EXISTING TABLES
-- ============================================================================
DROP TABLE IF EXISTS login_activity       CASCADE;
DROP TABLE IF EXISTS employee_invites     CASCADE;
DROP TABLE IF EXISTS audit_logs           CASCADE;
DROP TABLE IF EXISTS projects             CASCADE;
DROP TABLE IF EXISTS invoices             CASCADE;
DROP TABLE IF EXISTS proposals            CASCADE;
DROP TABLE IF EXISTS leads                CASCADE;
DROP TABLE IF EXISTS notifications        CASCADE;
DROP TABLE IF EXISTS timelogs             CASCADE;
DROP TABLE IF EXISTS task_comments        CASCADE;
DROP TABLE IF EXISTS tasks                CASCADE;
DROP TABLE IF EXISTS moms                 CASCADE;
DROP TABLE IF EXISTS advances             CASCADE;
DROP TABLE IF EXISTS leaves               CASCADE;
DROP TABLE IF EXISTS attendance           CASCADE;
DROP TABLE IF EXISTS daily_ops            CASCADE;
DROP TABLE IF EXISTS client_feedback      CASCADE;
DROP TABLE IF EXISTS interviews           CASCADE;
DROP TABLE IF EXISTS dev_projects         CASCADE;
DROP TABLE IF EXISTS smm_quotes           CASCADE;
DROP TABLE IF EXISTS smm_calendar         CASCADE;
DROP TABLE IF EXISTS ad_stats             CASCADE;
DROP TABLE IF EXISTS clients              CASCADE;
DROP TABLE IF EXISTS employees            CASCADE;

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- ── employees ───────────────────────────────────────────────────────────────
CREATE TABLE employees (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  email                TEXT UNIQUE NOT NULL,
  phone                TEXT DEFAULT '',
  role                 TEXT NOT NULL DEFAULT 'Employee',
  department           TEXT NOT NULL,
  designation          TEXT DEFAULT '',
  salary               NUMERIC NOT NULL DEFAULT 0,
  join_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  bio                  TEXT DEFAULT '',
  skills               TEXT DEFAULT '',
  manager_id           TEXT DEFAULT NULL,
  password             TEXT DEFAULT 'password123',
  avatar               TEXT DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'Active',
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login           TEXT DEFAULT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── clients ─────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  details     TEXT DEFAULT '',
  department  TEXT NOT NULL DEFAULT 'General',
  budget      NUMERIC NOT NULL DEFAULT 0,
  start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'Active'
);

-- ── ad_stats ────────────────────────────────────────────────────────────────
CREATE TABLE ad_stats (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id   TEXT DEFAULT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  budget      NUMERIC NOT NULL DEFAULT 0,
  active_ads  INT NOT NULL DEFAULT 0,
  lost_ads    INT NOT NULL DEFAULT 0
);

-- ── smm_calendar ────────────────────────────────────────────────────────────
CREATE TABLE smm_calendar (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  post_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  post_time   TEXT DEFAULT '09:00',
  platform    TEXT NOT NULL DEFAULT 'Instagram',
  caption     TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Draft'
);

-- ── smm_quotes ──────────────────────────────────────────────────────────────
CREATE TABLE smm_quotes (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── dev_projects ────────────────────────────────────────────────────────────
CREATE TABLE dev_projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Backlog',
  dev_id      TEXT DEFAULT NULL,
  deadline    DATE
);

-- ── interviews ──────────────────────────────────────────────────────────────
CREATE TABLE interviews (
  id              TEXT PRIMARY KEY,
  candidate_name  TEXT NOT NULL,
  position        TEXT NOT NULL,
  date            TEXT NOT NULL,
  interviewer_id  TEXT DEFAULT 'EMP01',
  status          TEXT NOT NULL DEFAULT 'Scheduled',
  link            TEXT DEFAULT 'https://meet.google.com'
);

-- ── client_feedback ─────────────────────────────────────────────────────────
CREATE TABLE client_feedback (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_name TEXT NOT NULL,
  department  TEXT NOT NULL,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT DEFAULT '',
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ── daily_ops ───────────────────────────────────────────────────────────────
CREATE TABLE daily_ops (
  id      TEXT PRIMARY KEY,
  task    TEXT NOT NULL,
  status  TEXT NOT NULL DEFAULT 'Pending'
);

-- ── attendance ──────────────────────────────────────────────────────────────
CREATE TABLE attendance (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT DEFAULT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in    TEXT DEFAULT '09:00',
  clock_out   TEXT DEFAULT '18:00',
  status      TEXT NOT NULL DEFAULT 'Present',
  type        TEXT DEFAULT 'Office',
  breaks      TEXT DEFAULT '[]'
);

-- ── leaves ──────────────────────────────────────────────────────────────────
CREATE TABLE leaves (
  id          TEXT PRIMARY KEY,
  employee_id TEXT DEFAULT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  type        TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Pending'
);

-- ── advances ────────────────────────────────────────────────────────────────
CREATE TABLE advances (
  id          TEXT PRIMARY KEY,
  employee_id TEXT DEFAULT NULL,
  amount      NUMERIC NOT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'Pending',
  reason      TEXT DEFAULT ''
);

-- ── moms (Minutes of Meetings) ─────────────────────────────────────────────
CREATE TABLE moms (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  attendees    TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  action_items TEXT DEFAULT ''
);

-- ── tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT DEFAULT '',
  assigned_to    TEXT DEFAULT NULL,
  assigned_by    TEXT DEFAULT '',
  department     TEXT DEFAULT '',
  project_id     TEXT DEFAULT 'General',
  priority       TEXT NOT NULL DEFAULT 'Medium',
  status         TEXT NOT NULL DEFAULT 'New',
  due_date       DATE,
  created_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  pinged         INT DEFAULT 0,
  last_pinged_at TIMESTAMPTZ DEFAULT NULL,
  scheduled_date DATE DEFAULT NULL,
  lead_id        TEXT DEFAULT NULL,
  source_dept    TEXT DEFAULT NULL
);

-- ── task_comments ───────────────────────────────────────────────────────────
CREATE TABLE task_comments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT DEFAULT NULL,
  user_id    TEXT DEFAULT '',
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── timelogs ────────────────────────────────────────────────────────────────
CREATE TABLE timelogs (
  id          TEXT PRIMARY KEY,
  employee_id TEXT DEFAULT NULL,
  task_id     TEXT DEFAULT '',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  hours       NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT ''
);

-- ── notifications ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id        TEXT PRIMARY KEY,
  user_id   TEXT DEFAULT '',
  message   TEXT NOT NULL,
  type      TEXT DEFAULT 'info',
  timestamp TEXT DEFAULT '',
  read      BOOLEAN NOT NULL DEFAULT false
);

-- ── leads ───────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  source      TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Lead',
  assigned_to TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ── proposals ───────────────────────────────────────────────────────────────
CREATE TABLE proposals (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  title       TEXT DEFAULT '',
  amount      NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Draft',
  created_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ── invoices ────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id          TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Unpaid',
  due_date    DATE,
  created_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ── projects ────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Backlog',
  deadline    DATE,
  created_at  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ── audit_logs ──────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id        TEXT PRIMARY KEY,
  user_id   TEXT DEFAULT '',
  action    TEXT NOT NULL,
  details   TEXT DEFAULT '',
  timestamp TEXT DEFAULT ''
);

-- ── employee_invites ────────────────────────────────────────────────────────
CREATE TABLE employee_invites (
  id          TEXT PRIMARY KEY,
  employee_id TEXT DEFAULT NULL,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted    BOOLEAN NOT NULL DEFAULT false,
  created_by  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── login_activity ──────────────────────────────────────────────────────────
CREATE TABLE login_activity (
  id          TEXT PRIMARY KEY,
  employee_id TEXT DEFAULT NULL,
  ip_address  TEXT DEFAULT '',
  device      TEXT DEFAULT '',
  login_at    TEXT DEFAULT '',
  logout_at   TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================
ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_calendar      ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves            ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE moms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelogs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activity    ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. RLS POLICIES — Permissive for authenticated role
-- ============================================================================
-- Pattern: SELECT / INSERT / UPDATE / DELETE — all allowed for authenticated users.
-- The app enforces business-level authorization in its own code.

-- employees
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE TO authenticated USING (true);

-- clients
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated USING (true);

-- ad_stats
CREATE POLICY "ad_stats_select" ON ad_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "ad_stats_insert" ON ad_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ad_stats_update" ON ad_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ad_stats_delete" ON ad_stats FOR DELETE TO authenticated USING (true);

-- smm_calendar
CREATE POLICY "smm_calendar_select" ON smm_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "smm_calendar_insert" ON smm_calendar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "smm_calendar_update" ON smm_calendar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "smm_calendar_delete" ON smm_calendar FOR DELETE TO authenticated USING (true);

-- smm_quotes
CREATE POLICY "smm_quotes_select" ON smm_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "smm_quotes_insert" ON smm_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "smm_quotes_update" ON smm_quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "smm_quotes_delete" ON smm_quotes FOR DELETE TO authenticated USING (true);

-- dev_projects
CREATE POLICY "dev_projects_select" ON dev_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "dev_projects_insert" ON dev_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dev_projects_update" ON dev_projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dev_projects_delete" ON dev_projects FOR DELETE TO authenticated USING (true);

-- interviews
CREATE POLICY "interviews_select" ON interviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "interviews_insert" ON interviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "interviews_update" ON interviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "interviews_delete" ON interviews FOR DELETE TO authenticated USING (true);

-- client_feedback
CREATE POLICY "client_feedback_select" ON client_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_feedback_insert" ON client_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "client_feedback_update" ON client_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "client_feedback_delete" ON client_feedback FOR DELETE TO authenticated USING (true);

-- daily_ops
CREATE POLICY "daily_ops_select" ON daily_ops FOR SELECT TO authenticated USING (true);
CREATE POLICY "daily_ops_insert" ON daily_ops FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "daily_ops_update" ON daily_ops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "daily_ops_delete" ON daily_ops FOR DELETE TO authenticated USING (true);

-- attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (true);

-- leaves
CREATE POLICY "leaves_select" ON leaves FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaves_insert" ON leaves FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leaves_update" ON leaves FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leaves_delete" ON leaves FOR DELETE TO authenticated USING (true);

-- advances
CREATE POLICY "advances_select" ON advances FOR SELECT TO authenticated USING (true);
CREATE POLICY "advances_insert" ON advances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "advances_update" ON advances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "advances_delete" ON advances FOR DELETE TO authenticated USING (true);

-- moms
CREATE POLICY "moms_select" ON moms FOR SELECT TO authenticated USING (true);
CREATE POLICY "moms_insert" ON moms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "moms_update" ON moms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "moms_delete" ON moms FOR DELETE TO authenticated USING (true);

-- tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

-- task_comments
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE TO authenticated USING (true);

-- timelogs
CREATE POLICY "timelogs_select" ON timelogs FOR SELECT TO authenticated USING (true);
CREATE POLICY "timelogs_insert" ON timelogs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "timelogs_update" ON timelogs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "timelogs_delete" ON timelogs FOR DELETE TO authenticated USING (true);

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (true);

-- leads
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated USING (true);

-- proposals
CREATE POLICY "proposals_select" ON proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "proposals_insert" ON proposals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "proposals_update" ON proposals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proposals_delete" ON proposals FOR DELETE TO authenticated USING (true);

-- invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (true);

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (true);

-- audit_logs
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_logs_update" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_delete" ON audit_logs FOR DELETE TO authenticated USING (true);

-- employee_invites
CREATE POLICY "employee_invites_select" ON employee_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee_invites_insert" ON employee_invites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employee_invites_update" ON employee_invites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employee_invites_delete" ON employee_invites FOR DELETE TO authenticated USING (true);

-- login_activity
CREATE POLICY "login_activity_select" ON login_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "login_activity_insert" ON login_activity FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "login_activity_update" ON login_activity FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "login_activity_delete" ON login_activity FOR DELETE TO authenticated USING (true);


-- ============================================================================
-- 4. GRANT STATEMENTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Per-table GRANTs (belt-and-suspenders — ensures permissions even if the
-- blanket grant above ran before a table was created in a different txn)
GRANT ALL ON employees         TO authenticated;
GRANT ALL ON clients           TO authenticated;
GRANT ALL ON ad_stats          TO authenticated;
GRANT ALL ON smm_calendar      TO authenticated;
GRANT ALL ON smm_quotes        TO authenticated;
GRANT ALL ON dev_projects      TO authenticated;
GRANT ALL ON interviews        TO authenticated;
GRANT ALL ON client_feedback   TO authenticated;
GRANT ALL ON daily_ops         TO authenticated;
GRANT ALL ON attendance        TO authenticated;
GRANT ALL ON leaves            TO authenticated;
GRANT ALL ON advances          TO authenticated;
GRANT ALL ON moms              TO authenticated;
GRANT ALL ON tasks             TO authenticated;
GRANT ALL ON task_comments     TO authenticated;
GRANT ALL ON timelogs          TO authenticated;
GRANT ALL ON notifications     TO authenticated;
GRANT ALL ON leads             TO authenticated;
GRANT ALL ON proposals         TO authenticated;
GRANT ALL ON invoices          TO authenticated;
GRANT ALL ON projects          TO authenticated;
GRANT ALL ON audit_logs        TO authenticated;
GRANT ALL ON employee_invites  TO authenticated;
GRANT ALL ON login_activity    TO authenticated;


-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

-- employees
CREATE INDEX idx_employees_email       ON employees (email);
CREATE INDEX idx_employees_department  ON employees (department);
CREATE INDEX idx_employees_role        ON employees (role);
CREATE INDEX idx_employees_status      ON employees (status);
CREATE INDEX idx_employees_manager     ON employees (manager_id);

-- clients
CREATE INDEX idx_clients_department    ON clients (department);
CREATE INDEX idx_clients_status        ON clients (status);

-- ad_stats
CREATE INDEX idx_ad_stats_client       ON ad_stats (client_id);
CREATE INDEX idx_ad_stats_date         ON ad_stats (log_date);

-- smm_calendar
CREATE INDEX idx_smm_calendar_date     ON smm_calendar (post_date);
CREATE INDEX idx_smm_calendar_status   ON smm_calendar (status);

-- smm_quotes
CREATE INDEX idx_smm_quotes_status     ON smm_quotes (status);

-- dev_projects
CREATE INDEX idx_dev_projects_status   ON dev_projects (status);
CREATE INDEX idx_dev_projects_dev      ON dev_projects (dev_id);

-- interviews
CREATE INDEX idx_interviews_date       ON interviews (date);
CREATE INDEX idx_interviews_status     ON interviews (status);
CREATE INDEX idx_interviews_interviewer ON interviews (interviewer_id);

-- client_feedback
CREATE INDEX idx_feedback_department   ON client_feedback (department);
CREATE INDEX idx_feedback_date         ON client_feedback (log_date);

-- attendance
CREATE INDEX idx_attendance_employee   ON attendance (employee_id);
CREATE INDEX idx_attendance_date       ON attendance (log_date);
CREATE INDEX idx_attendance_status     ON attendance (status);

-- leaves
CREATE INDEX idx_leaves_employee       ON leaves (employee_id);
CREATE INDEX idx_leaves_status         ON leaves (status);
CREATE INDEX idx_leaves_dates          ON leaves (start_date, end_date);

-- advances
CREATE INDEX idx_advances_employee     ON advances (employee_id);
CREATE INDEX idx_advances_status       ON advances (status);
CREATE INDEX idx_advances_date         ON advances (log_date);

-- moms
CREATE INDEX idx_moms_date             ON moms (date);

-- tasks
CREATE INDEX idx_tasks_assigned_to     ON tasks (assigned_to);
CREATE INDEX idx_tasks_assigned_by     ON tasks (assigned_by);
CREATE INDEX idx_tasks_department      ON tasks (department);
CREATE INDEX idx_tasks_project         ON tasks (project_id);
CREATE INDEX idx_tasks_status          ON tasks (status);
CREATE INDEX idx_tasks_priority        ON tasks (priority);
CREATE INDEX idx_tasks_due_date        ON tasks (due_date);

-- task_comments
CREATE INDEX idx_task_comments_task    ON task_comments (task_id);
CREATE INDEX idx_task_comments_user    ON task_comments (user_id);

-- timelogs
CREATE INDEX idx_timelogs_employee     ON timelogs (employee_id);
CREATE INDEX idx_timelogs_task         ON timelogs (task_id);
CREATE INDEX idx_timelogs_date         ON timelogs (date);

-- notifications
CREATE INDEX idx_notifications_user    ON notifications (user_id);
CREATE INDEX idx_notifications_read    ON notifications (read);

-- leads
CREATE INDEX idx_leads_status          ON leads (status);
CREATE INDEX idx_leads_assigned        ON leads (assigned_to);
CREATE INDEX idx_leads_created         ON leads (created_at);

-- proposals
CREATE INDEX idx_proposals_status      ON proposals (status);
CREATE INDEX idx_proposals_created     ON proposals (created_at);

-- invoices
CREATE INDEX idx_invoices_status       ON invoices (status);
CREATE INDEX idx_invoices_due          ON invoices (due_date);
CREATE INDEX idx_invoices_created      ON invoices (created_at);

-- projects
CREATE INDEX idx_projects_status       ON projects (status);
CREATE INDEX idx_projects_deadline     ON projects (deadline);

-- audit_logs
CREATE INDEX idx_audit_logs_user       ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs (action);

-- employee_invites
CREATE INDEX idx_invites_employee      ON employee_invites (employee_id);
CREATE INDEX idx_invites_email         ON employee_invites (email);
CREATE INDEX idx_invites_token         ON employee_invites (token);
CREATE INDEX idx_invites_accepted      ON employee_invites (accepted);

-- login_activity
CREATE INDEX idx_login_activity_employee ON login_activity (employee_id);
CREATE INDEX idx_login_activity_login    ON login_activity (login_at);


-- ============================================================================
-- Done! All 24 tables are ready.
-- ============================================================================

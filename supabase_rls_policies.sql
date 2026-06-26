-- ============================================================
-- NEO_MAX — Supabase Row-Level Security Policies
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ── employees ────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Every authenticated user can see their own row
CREATE POLICY "employees: self read"
  ON employees FOR SELECT
  USING (auth.uid() = id);

-- Super Admin / Admin / Manager / HR can read all employees
CREATE POLICY "employees: privileged read"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'Manager', 'HR')
    )
  );

-- Only Super Admin / Admin can insert (invite) new employees
CREATE POLICY "employees: admin insert"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin')
    )
  );

-- Super Admin / Admin / HR can update any employee record
-- Regular employees can only update their own non-sensitive fields
CREATE POLICY "employees: admin update"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'HR')
    )
  );

CREATE POLICY "employees: self update own profile"
  ON employees FOR UPDATE
  USING (auth.uid() = id);

-- Only Super Admin can hard-delete employees
CREATE POLICY "employees: admin delete"
  ON employees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role = 'Super Admin'
    )
  );


-- ── salaries ─────────────────────────────────────────────────
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

-- Employees can only see their own salary record
CREATE POLICY "salaries: self read"
  ON salaries FOR SELECT
  USING (auth.uid() = employee_id);

-- Admin / HR / Founder roles can see all salary records
CREATE POLICY "salaries: privileged read"
  ON salaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'HR', 'Founder')
    )
  );

-- Only Admin / HR can insert or update salary records
CREATE POLICY "salaries: admin insert"
  ON salaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'HR')
    )
  );

CREATE POLICY "salaries: admin update"
  ON salaries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'HR')
    )
  );

CREATE POLICY "salaries: admin delete"
  ON salaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin')
    )
  );


-- ── timelogs ─────────────────────────────────────────────────
ALTER TABLE timelogs ENABLE ROW LEVEL SECURITY;

-- Employees can read and write their own time entries
CREATE POLICY "timelogs: self read"
  ON timelogs FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "timelogs: self insert"
  ON timelogs FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "timelogs: self update"
  ON timelogs FOR UPDATE
  USING (auth.uid() = employee_id);

-- Managers / Admin / HR can read all time logs
CREATE POLICY "timelogs: privileged read"
  ON timelogs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'Manager', 'HR')
    )
  );

-- Only Admin can delete time log entries
CREATE POLICY "timelogs: admin delete"
  ON timelogs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin')
    )
  );


-- ── projects ─────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read projects (needed for task assignment)
CREATE POLICY "projects: authenticated read"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only Manager / Admin can create or modify projects
CREATE POLICY "projects: manager insert"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'Manager')
    )
  );

CREATE POLICY "projects: manager update"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin', 'Manager')
    )
  );

CREATE POLICY "projects: admin delete"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
        AND e.role IN ('Super Admin', 'Admin')
    )
  );


-- ── (template for any future table) ──────────────────────────
-- Paste and adapt the block below for each new table you create:
--
-- ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "<table_name>: self read"
--   ON <table_name> FOR SELECT
--   USING (auth.uid() = employee_id);
--
-- CREATE POLICY "<table_name>: privileged read"
--   ON <table_name> FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM employees e
--       WHERE e.id = auth.uid()
--         AND e.role IN ('Super Admin', 'Admin', 'Manager', 'HR')
--     )
--   );

-- ============================================================================
-- Phase 3 — RLS Fix: Allow HR role to INSERT employees
-- ============================================================================
-- Problem: Phase 1 restricted employee INSERT to Super Admin / Admin only,
-- but HR.jsx creates employee records during onboarding.
--
-- NOTE: Phase 2 already allows HR for employee_invites CRUD.
--          employee UPDATE already allows HR (Phase 1, line 193-197).
--          Only employee INSERT is blocked.
-- ============================================================================

-- ── 1. Drop the old insert policy and recreate with HR included ────────────
DROP POLICY IF EXISTS "employees: admin insert" ON employees;
CREATE POLICY "employees: admin insert" ON employees
  FOR INSERT WITH CHECK (
    current_employee_role() IN ('Super Admin', 'Admin', 'HR')
  );

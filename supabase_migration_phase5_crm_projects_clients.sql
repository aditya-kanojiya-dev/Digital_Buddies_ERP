-- ============================================================================
-- Digital Buddies ERP — Phase 5: Client Management + CRM Pipeline + Projects
-- ============================================================================
-- Run this AFTER phases 1–4 in the Supabase SQL Editor.
-- Additive-only — safe on a live database.
-- ============================================================================

-- ── 1a. clients — richer account record ────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source                 TEXT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes                  TEXT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to            TEXT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS converted_from_lead_id TEXT DEFAULT NULL;

-- ── 1b. proposals / invoices — add missing client_id FK ──────────────────
-- Keep client_name (NOT NULL) for display, populate both going forward.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_id TEXT DEFAULT NULL;
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS client_id TEXT DEFAULT NULL;

-- ── 1c. projects — add actual columns that JS has been sending ────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id  TEXT    DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id   TEXT    DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget     NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department TEXT    DEFAULT NULL;

-- ── 1d. Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_client   ON projects (client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client   ON proposals (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client    ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned   ON clients (assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_source     ON clients (source);

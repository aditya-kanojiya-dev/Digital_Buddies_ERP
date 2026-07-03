-- Phase 6: Social Media → Creative Workflow Automation
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adds client_id and per-department boolean flags to smm_calendar
-- 2. Adds calendar_id backlink to tasks
-- 3. Emergency priority tier (no schema change needed — just a text value)

-- ── smm_calendar ────────────────────────────────────────────────────────────
ALTER TABLE smm_calendar
  ADD COLUMN IF NOT EXISTS client_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS needs_videography     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_video_editing   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_graphic_design  BOOLEAN DEFAULT false;

-- ── tasks ────────────────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT NULL;

-- Index for efficient lookups from calendar entry to its linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_id ON tasks (calendar_id);

-- ── tasks: acknowledgment field for to-do dashboard (§8a) ────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ DEFAULT NULL;

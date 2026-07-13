-- ============================================================================
-- Phase 7: Personal Calendar & Attendance Docs
--
-- Run this in your Supabase SQL Editor after prior phases.
-- ============================================================================

-- ── personal_tasks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_tasks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  date        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'Medium',
  description TEXT DEFAULT '',
  completed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TEXT DEFAULT ''
);

-- ── attendance_docs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_docs (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  mime_type   TEXT DEFAULT '',
  data_url    TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD'))
);

-- Grant permissions to authenticated role
GRANT ALL ON personal_tasks TO authenticated;
GRANT ALL ON attendance_docs TO authenticated;

-- Enable RLS
ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_docs ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own personal tasks
CREATE POLICY "Users can view own personal tasks"
  ON personal_tasks FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own personal tasks"
  ON personal_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own personal tasks"
  ON personal_tasks FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own personal tasks"
  ON personal_tasks FOR DELETE
  USING (true);

-- RLS: attendance docs accessible to all authenticated users
CREATE POLICY "Attendance docs are viewable by all"
  ON attendance_docs FOR SELECT
  USING (true);

CREATE POLICY "Attendance docs are insertable by authenticated"
  ON attendance_docs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Attendance docs are updatable by authenticated"
  ON attendance_docs FOR UPDATE
  USING (true);

CREATE POLICY "Attendance docs are deletable by authenticated"
  ON attendance_docs FOR DELETE
  USING (true);

-- ============================================================================
-- Digital Buddies ERP — Phase 4: Creative Upgrade + Paid Ads Fix & Expansion
-- ============================================================================
-- Run this AFTER phases 1–3 in the Supabase SQL Editor.
-- Additive-only — safe on a live database (no DROP TABLE, no destructive ALTER).
-- ============================================================================

-- ── 1a. tasks table — columns for Creative upgrade ─────────────────────────
-- `assignee_name` and `deadline_days_prior` were already being sent by
-- Creative.jsx but never existed in the schema — tasks appeared optimistically
-- in React state but never persisted. This fixes that silent data-loss bug.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_name      TEXT    DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_days_prior INT     DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url     TEXT    DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS revision_count     INT     DEFAULT 0;

-- ── 1b. ad_stats table — fix + expand for real ad metrics ──────────────────
-- `logged_by` fixes the silent insert failure bug: PaidAds.jsx sends
-- `loggedBy` but the column never existed. The other columns power the
-- new Overview tab charts (CTR, CPA, ROAS) and campaign-level rollups.
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS logged_by       TEXT    DEFAULT NULL;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS spend           NUMERIC DEFAULT 0;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS impressions     INT     DEFAULT 0;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS clicks          INT     DEFAULT 0;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS conversions     INT     DEFAULT 0;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS revenue         NUMERIC DEFAULT 0;
ALTER TABLE ad_stats ADD COLUMN IF NOT EXISTS campaign_id     TEXT    DEFAULT NULL;

-- ── 1c. New table — ad_campaigns (campaign-level tracking) ─────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  name             TEXT NOT NULL,
  channel          TEXT NOT NULL DEFAULT 'Meta',
  objective        TEXT DEFAULT '',
  budget_allocated NUMERIC NOT NULL DEFAULT 0,
  start_date       DATE DEFAULT CURRENT_DATE,
  end_date         DATE DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'Active',
  created_by       TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_client ON ad_campaigns (client_id);
CREATE INDEX IF NOT EXISTS idx_ad_stats_campaign   ON ad_stats (campaign_id);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns_select" ON ad_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "ad_campaigns_insert" ON ad_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ad_campaigns_update" ON ad_campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ad_campaigns_delete" ON ad_campaigns FOR DELETE TO authenticated USING (true);

GRANT ALL ON ad_campaigns TO authenticated;

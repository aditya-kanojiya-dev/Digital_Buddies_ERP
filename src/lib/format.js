// ============================================================================
// format.js — shared formatting + id/timestamp helpers
//
// Centralizes patterns that were duplicated across components:
//   - `${PREFIX}${Date.now()}` id generation  → genId('PRP')
//   - new Date().toISOString() slicing         → today / nowStamp
//   - ad-hoc currency / date rendering          → fmtCurrency / fmtDate
// ============================================================================

let __seq = Date.now();

/**
 * Generate a unique ID using timestamp + random suffix.
 * Format: T-1720912345678-a3f (no collisions across browsers).
 */
export const genId = (prefix = 'T') => {
  __seq++;
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${__seq}-${rand}`;
};

/** Date-only string, YYYY-MM-DD — for date fields/inputs. */
export const today = () => new Date().toISOString().split('T')[0];

/** Add N days to a YYYY-MM-DD date string (UTC-safe). */
export const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

/** Compact "YYYY-MM-DD HH:mm" stamp — used by audit logs / login activity. */
export const nowStamp = () =>
  new Date().toISOString().replace('T', ' ').substring(0, 16);

// ── Display formatters ──────────────────────────────────────────────────────

/** Human date, e.g. "29 Jun 2026". Safe on null/invalid. */
export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Human date + time, e.g. "29 Jun 2026, 2:32 PM". */
export const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Currency formatter. Defaults to INR (₹) since this is an India-based agency
 * ERP; pass a different currency code to override.
 */
export const fmtCurrency = (amount, currency = 'INR') => {
  const n = Number(amount);
  if (!isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n.toLocaleString('en-IN')}`;
  }
};

/**
 * Relative time, e.g. "2h ago", "just now", "in 3d". Accepts anything
 * Date can parse. Returns '—' for empty values.
 */
export const timeAgo = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);

  const diffMs = d.getTime() - Date.now();
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);

  const units = [
    ['y', 31536000000],
    ['mo', 2592000000],
    ['d', 86400000],
    ['h', 3600000],
    ['m', 60000],
  ];

  if (abs < 45000) return 'just now';

  for (const [label, ms] of units) {
    const qty = Math.floor(abs / ms);
    if (qty >= 1) return past ? `${qty}${label} ago` : `in ${qty}${label}`;
  }
  return 'just now';
};

/** First-letter avatar fallback. */
export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

/**
 * Compute a task due date from priority, timeline, and rule settings.
 * Shared by ManagerDashboard and SocialMedia.
 */
export const computeDueDate = ({ priority, timelineDays, dueDate, rule, fallbackDays = 7 }) => {
  if (priority === 'Emergency') {
    if (timelineDays === '2') return addDays(today(), 2);
    if (timelineDays === '1') return addDays(today(), 1);
    return today();
  }
  if (rule.mode === 'manual') return dueDate || addDays(today(), fallbackDays);
  if (rule.mode === 'fixed') return addDays(today(), rule.days);
  if (rule.mode === 'select') return addDays(today(), parseInt(timelineDays || '3'));
  return dueDate || addDays(today(), fallbackDays);
};

/**
 * Factory for the standard notification shape used across the app.
 * Extra fields are spread onto the object (e.g. deadlineTaskId, deadlineDate).
 */
export const createNotification = ({ userId, message, type = 'info', timestamp, ...extra }) => ({
  id: genId('NTF'),
  userId,
  message,
  type,
  timestamp: timestamp || nowStamp(),
  read: false,
  ...extra,
});

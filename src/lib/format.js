// ============================================================================
// format.js — shared formatting + id/timestamp helpers + linkify
//
// Centralizes patterns that were duplicated across components:
//   - `${PREFIX}${Date.now()}` id generation  → genId('PRP')
//   - new Date().toISOString() slicing         → isoNow / today / nowStamp
//   - ad-hoc currency / date rendering          → fmtCurrency / fmtDate
// ============================================================================

import { createElement } from 'react';

let __seq = 0;

const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<.]+(?:\.[^\s<.]+)+)/gi;

/**
 * Detect URLs in plain text and render them as clickable <a> tags.
 * Safe — only matches http/https/www patterns, no HTML passthrough.
 * Links open in a new tab with `rel="noopener noreferrer"`.
 * Returns a React node or the original string if no URLs found.
 */
export function linkifyText(text) {
  if (!text) return text;

  const parts = text.split(URL_RE);
  if (parts.length === 1) return text;

  const result = [];
  let key = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
      const href = /^www\./i.test(part) ? `https://${part}` : part;
      result.push(
        createElement('a', {
          key: key++,
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors',
          onClick: (e) => e.stopPropagation(),
        }, part)
      );
    } else {
      result.push(part);
    }
  }

  return result.length === 1 ? result[0] : result;
}

/**
 * Generate a collision-resistant id with a domain prefix, matching the
 * existing convention (e.g. `PRP1719663...`). A short rolling sequence is
 * appended so two ids minted in the same millisecond don't collide.
 */
export const genId = (prefix = 'ID') => {
  __seq = (__seq + 1) % 1000;
  return `${prefix}${Date.now()}${__seq.toString().padStart(3, '0')}`;
};

/** Full ISO timestamp — for DB storage. e.g. 2026-06-29T14:32:45.123Z */
export const isoNow = () => new Date().toISOString();

/** Date-only string, YYYY-MM-DD — for date fields/inputs. */
export const today = () => new Date().toISOString().split('T')[0];

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

/** Plain number with thousands separators. */
export const fmtNumber = (n) => {
  const v = Number(n);
  return isFinite(v) ? v.toLocaleString('en-IN') : '—';
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

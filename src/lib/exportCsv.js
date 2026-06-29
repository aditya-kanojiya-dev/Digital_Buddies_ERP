// ============================================================================
// exportCsv.js — single CSV export helper
//
// Replaces the three hand-rolled CSV builders previously copy-pasted into
// FounderDashboard.jsx, HR.jsx and PaidAds.jsx. Handles quoting/escaping and
// triggers a browser download.
// ============================================================================

/** Escape a single CSV cell per RFC 4180 (quote + double inner quotes). */
const cell = (value) => {
  if (value === null || value === undefined) return '""';
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
};

/**
 * Build CSV text from an array of objects.
 *
 * @param {Array<Object>} rows   - data rows
 * @param {Array<{key:string,label:string}>} [columns]
 *        Optional column spec. If omitted, keys of the first row are used.
 */
export const toCsv = (rows = [], columns) => {
  if (!rows.length) return '';
  const cols =
    columns ||
    Object.keys(rows[0]).map((key) => ({ key, label: key }));

  const header = cols.map((c) => cell(c.label)).join(',');
  const body = rows
    .map((row) => cols.map((c) => cell(row[c.key])).join(','))
    .join('\n');

  return `${header}\n${body}`;
};

/**
 * Build a CSV and trigger a download.
 *
 * @param {string} filename  - e.g. "invoices.csv" (".csv" appended if missing)
 * @param {Array<Object>} rows
 * @param {Array<{key,label}>} [columns]
 */
export const exportCsv = (filename, rows = [], columns) => {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const csv = toCsv(rows, columns);

  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================================
// printDoc.js — open a styled, printable document in a new window
//
// Used for "export to PDF" via the browser print dialog (replaces the plain
// .txt proposal dump in CRM.jsx, and unifies payslip / invoice / proposal
// printing). The document is self-contained light-themed HTML so it prints
// cleanly on paper regardless of the dark app theme.
// ============================================================================

const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, Segoe UI, Roboto, sans-serif;
    color: #1e1b2e;
    padding: 48px;
    max-width: 820px;
    margin: 0 auto;
    line-height: 1.5;
  }
  .doc-brand {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 32px;
  }
  .doc-brand h1 { font-size: 22px; color: #7c3aed; letter-spacing: -0.5px; }
  .doc-brand .meta { text-align: right; font-size: 12px; color: #6b7280; }
  h2 { font-size: 18px; margin: 0 0 6px; }
  .muted { color: #6b7280; font-size: 13px; }
  .row { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
  .block { flex: 1; min-width: 200px; }
  .block .label { text-transform: uppercase; font-size: 10px; letter-spacing: 1px; color: #9ca3af; margin-bottom: 4px; }
  .block .value { font-size: 14px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th, td { text-align: left; padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f5f3ff; color: #6d28d9; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #7c3aed; border-bottom: none; }
  .section { margin: 24px 0; }
  .section p { font-size: 13px; color: #374151; white-space: pre-wrap; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f5f3ff; color: #6d28d9; }
  .doc-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 24px; } @page { margin: 16mm; } }
`;

/**
 * Open a print-ready window with the given inner HTML body.
 *
 * @param {Object}  opts
 * @param {string}  opts.title    - document <title> + window name
 * @param {string}  opts.body     - inner HTML (use the helper builders below)
 * @param {boolean} [opts.autoPrint=true] - call window.print() once loaded
 */
export const printDoc = ({ title = 'Document', body = '', autoPrint = true }) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    throw new Error('Popup blocked — allow popups to export/print this document.');
  }

  win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${BASE_STYLES}</style>
  </head>
  <body>
    ${body}
    <div class="doc-footer">Digital Buddies ERP · Generated ${new Date().toLocaleString()}</div>
  </body>
</html>`);
  win.document.close();

  if (autoPrint) {
    // Give the new document a tick to lay out before invoking print.
    win.focus();
    win.onload = () => setTimeout(() => win.print(), 250);
  }
  return win;
};

// ── Small HTML builders so callers don't write raw markup ────────────────────

export const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Branded header with a right-aligned reference/date block. */
export const docHeader = (subtitle = '', metaLines = []) => `
  <div class="doc-brand">
    <div>
      <h1>Digital Buddies</h1>
      ${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    <div class="meta">${metaLines.map(escapeHtml).join('<br/>')}</div>
  </div>`;

/** A row of label/value info blocks. items: [{label, value}] */
export const docInfoRow = (items = []) => `
  <div class="row">
    ${items
      .map(
        (i) => `<div class="block">
          <div class="label">${escapeHtml(i.label)}</div>
          <div class="value">${escapeHtml(i.value ?? '—')}</div>
        </div>`
      )
      .join('')}
  </div>`;

/**
 * A line-items table. columns: [{label, num?}], rows: [[cell, cell, ...]],
 * optional total: [label, value].
 */
export const docTable = (columns = [], rows = [], total) => `
  <table>
    <thead><tr>${columns
      .map((c) => `<th class="${c.num ? 'num' : ''}">${escapeHtml(c.label)}</th>`)
      .join('')}</tr></thead>
    <tbody>
      ${rows
        .map(
          (r) =>
            `<tr>${r
              .map(
                (cell, i) =>
                  `<td class="${columns[i]?.num ? 'num' : ''}">${escapeHtml(cell)}</td>`
              )
              .join('')}</tr>`
        )
        .join('')}
      ${
        total
          ? `<tr class="total-row"><td colspan="${columns.length - 1}">${escapeHtml(
              total[0]
            )}</td><td class="num">${escapeHtml(total[1])}</td></tr>`
          : ''
      }
    </tbody>
  </table>`;

/** A free-text section with heading. */
export const docSection = (heading, text) => `
  <div class="section">
    <div class="label" style="text-transform:uppercase;font-size:10px;letter-spacing:1px;color:#9ca3af;margin-bottom:6px;">${escapeHtml(
      heading
    )}</div>
    <p>${escapeHtml(text || '—')}</p>
  </div>`;

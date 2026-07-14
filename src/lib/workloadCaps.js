/**
 * workloadCaps.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Workload cap logic for Creative departments.
 *
 * Caps per department:
 *   Video Editors / Graphic Designers:  7 soft max, 9 hard cap
 *   Videography/Photography:            2 hard cap (no soft range)
 *
 * "Load" for a given day = active tasks (New / In Progress / Review)
 * assigned to that person with dueDate on that day.
 */

const WORKLOAD_CAPS = {
  'Video Editors':           { softMax: 7, hardCap: 9 },
  'Graphic Designers':       { softMax: 7, hardCap: 9 },
  'Videography/Photography': { softMax: 2, hardCap: 2 },
};

const ACTIVE_STATUSES = new Set(['New', 'In Progress', 'Review']);

/**
 * Count how many active tasks a person already has on a given due date.
 * Excludes tasks with shootApprovalStatus === 'pending' (not yet confirmed).
 */
function countDayLoad(tasks, personId, dateStr) {
  if (!tasks || !personId || !dateStr) return 0;
  return tasks.filter(t =>
    (t.assignedTo === personId || t.assignedTo2 === personId)
    && t.dueDate === dateStr
    && ACTIVE_STATUSES.has(t.status)
    && t.shootApprovalStatus !== 'pending'
  ).length;
}

/**
 * Get workload info for display and enforcement.
 *
 * Returns:
 *   { load: number, softMax: number, hardCap: number, color: string,
 *     canAssign: boolean, reason: string | null }
 *
 * color: 'green' (< softMax), 'amber' (softMax–hardCap-1), 'red' (hardCap)
 * canAssign: false if the hard cap is already hit (or would be hit with +1
 *   and priority isn't Emergency)
 */
export function getWorkloadInfo(tasks, personId, dateStr, department, priority) {
  const caps = WORKLOAD_CAPS[department];
  if (!caps) {
    // Department without caps — always allow
    return { load: 0, softMax: Infinity, hardCap: Infinity, color: 'green', canAssign: true, reason: null };
  }

  const load = countDayLoad(tasks, personId, dateStr);
  const { softMax, hardCap } = caps;

  // Determine color
  let color = 'green';
  if (load >= hardCap) {
    color = 'red';
  } else if (load >= softMax) {
    color = 'amber';
  }

  // Determine if assigning another task is allowed
  let canAssign = true;
  let reason = null;

  if (load >= hardCap) {
    // Truly at cap — nothing can bypass
    canAssign = false;
    reason = `Already at cap (${load}/${hardCap}) for ${dateStr}. Pick a different person or date.`;
  } else if (load >= softMax && priority !== 'Emergency') {
    // At soft max — only Emergency can push through
    canAssign = false;
    const remaining = hardCap - load;
    reason = `${load}/${softMax} tasks on ${dateStr}. Mark as Emergency to assign (${remaining} slot${remaining > 1 ? 's' : ''} remaining).`;
  } else if (load >= softMax && priority === 'Emergency') {
    // At soft max with Emergency — allowed (up to hard cap)
    const remaining = hardCap - load;
    reason = `⚠️ Emergency — ${load}/${softMax} tasks, ${remaining} slot${remaining > 1 ? 's' : ''} remaining until hard cap.`;
  }

  return { load, softMax, hardCap, color, canAssign, reason };
}

/**
 * Format workload label, e.g. "Priya — 6/7 tasks on May 10"
 */
export function formatWorkloadLabel(employeeName, load, softMax, dateStr) {
  if (softMax === Infinity) return employeeName;
  const date = dateStr ? new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
  return `${employeeName} — ${load}/${softMax} tasks on ${date}`;
}

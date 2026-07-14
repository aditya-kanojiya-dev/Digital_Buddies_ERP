/**
 * deadlineEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans all active tasks and emits system notifications for:
 *
 *   deadline-overdue  →  dueDate < today, task not completed
 *   deadline-today    →  dueDate === today, task not completed
 *   deadline-24h      →  dueDate === tomorrow, task not completed
 *   deadline-headsUp  →  today === dueDate - 2 (for calendar-linked tasks only)
 *                        — gives a pre-deadline heads-up matching the
 *                        "5–7 days" / "3–5 days" lead-time windows.
 *
 * Dedup strategy: one notification per (taskId × type × calendar-day).
 * A stable deterministic ID (`NTF_DL_{taskId}_{type}_{todayStr}`) means
 * running the engine twice on the same day never creates duplicates even
 * if the existing notifications array is empty (Supabase insert will reject
 * the duplicate PK on the second run).
 *
 * Also exports ping-cooldown helpers used by ManagerDashboard.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Hours a manager must wait before pinging the same task again. */
export const PING_COOLDOWN_HOURS = 4;

/** Task statuses that mean "done — skip deadline checks". */
const TERMINAL = new Set(['Completed', 'Blocked']);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string into a local-midnight Date.
 * Using `new Date(str)` would give UTC midnight which shifts by timezone.
 */
const parseLocalDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

/** Today's date string in YYYY-MM-DD (local). */
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Tomorrow's date string in YYYY-MM-DD (local). */
const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Return the date N days before a given date string. */
const daysBefore = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - n);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

// ─── Main engine ──────────────────────────────────────────────────────────────

/**
 * @param {{ tasks: object[], notifications: object[] }} param
 * @returns {object[]}  Array of new notification objects ready to be persisted.
 *                      Returns [] if nothing new to emit.
 */
export function runDeadlineEngine({ tasks, notifications }) {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Build a dedup set from existing deadline notifications:
    // key = "taskId:type:date"
    const seen = new Set(
        notifications
            .filter(n => n.deadlineTaskId)
            .map(n => `${n.deadlineTaskId}:${n.type}:${n.deadlineDate}`)
    );

    const fresh = [];

    for (const task of tasks) {
        if (!task.dueDate) continue;
        if (!task.assignedTo) continue;
        if (TERMINAL.has(task.status)) continue;

        let type = null;
        let message = null;

        if (task.dueDate < today) {
            // Overdue — calculate how many days late
            const dueDate = parseLocalDate(task.dueDate);
            const todayDate = parseLocalDate(today);
            const daysLate = Math.floor((todayDate - dueDate) / 86_400_000);
            type = 'deadline-overdue';
            message = `⚠️ OVERDUE (${daysLate}d): "${task.title}" was due on ${task.dueDate}. Update your status or request an extension.`;

        } else if (task.dueDate === today) {
            type = 'deadline-today';
            message = `🔴 Due TODAY: "${task.title}" must be completed before end of day.`;

        } else if (task.dueDate === tomorrow) {
            type = 'deadline-24h';
            message = `🟡 Due tomorrow (${tomorrow}): "${task.title}" — make sure you're on track.`;

        } else if (task.calendar_id && today === daysBefore(task.dueDate, 2)) {
            // Heads-up for calendar-linked tasks: 2 days before due date
            // (post date - upper bound of lead-time window)
            type = 'deadline-headsUp';
            message = `🔔 Heads-up: "${task.title}" is due in 2 days (${task.dueDate}). Start planning your work.`;
        }

        if (!type) continue;

        const dedupKey = `${task.id}:${type}:${today}`;
        if (seen.has(dedupKey)) continue;

        // Stable deterministic ID so Supabase rejects double-inserts as duplicate PKs
        const notifId = `NTF_DL_${task.id}_${type}_${today}`;

        fresh.push({
            id: notifId,
            userId: task.assignedTo,
            message,
            type,
            // Extra fields used for dedup on future runs
            deadlineTaskId: task.id,
            deadlineDate: today,
            timestamp: now,
            read: false,
        });

        // Also notify co-assignee if present
        if (task.assignedTo2 && task.assignedTo2 !== task.assignedTo) {
            const coDedupKey = `${task.id}:${type}:${today}:co`;
            if (!seen.has(coDedupKey)) {
                fresh.push({
                    id: `NTF_DL_${task.id}_${type}_${today}_co`,
                    userId: task.assignedTo2,
                    message,
                    type,
                    deadlineTaskId: task.id,
                    deadlineDate: today,
                    timestamp: now,
                    read: false,
                });
                seen.add(coDedupKey);
            }
        }

        seen.add(dedupKey); // guard against the same task appearing twice in the array
    }

    return fresh;
}

// ─── Ping cooldown helpers ────────────────────────────────────────────────────

/**
 * Check whether a manager can ping a task right now.
 *
 * @param {object} task  - task object (must have optional `lastPingedAt` ISO string)
 * @param {number} [cooldownHours=PING_COOLDOWN_HOURS]
 * @returns {{ canPing: boolean, hoursLeft: number, minutesLeft: number }}
 */
export function checkPingCooldown(task, cooldownHours = PING_COOLDOWN_HOURS) {
    if (!task.lastPingedAt) return { canPing: true, hoursLeft: 0, minutesLeft: 0 };

    const lastMs = new Date(task.lastPingedAt).getTime();
    const nowMs = Date.now();
    const elapsedH = (nowMs - lastMs) / 3_600_000;

    if (elapsedH >= cooldownHours) return { canPing: true, hoursLeft: 0, minutesLeft: 0 };

    const remainingMs = (cooldownHours * 3_600_000) - (nowMs - lastMs);
    const hoursLeft = Math.floor(remainingMs / 3_600_000);
    const minutesLeft = Math.ceil((remainingMs % 3_600_000) / 60_000);

    return { canPing: false, hoursLeft, minutesLeft };
}

/**
 * Human-readable cooldown label, e.g. "3h 22m remaining".
 */
export function formatCooldown(task, cooldownHours = PING_COOLDOWN_HOURS) {
    const { canPing, hoursLeft, minutesLeft } = checkPingCooldown(task, cooldownHours);
    if (canPing) return null;
    if (hoursLeft > 0) return `${hoursLeft}h ${minutesLeft}m cooldown`;
    return `${minutesLeft}m cooldown`;
}
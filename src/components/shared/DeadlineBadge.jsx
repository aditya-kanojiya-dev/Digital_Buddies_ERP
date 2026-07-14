import React from 'react';
import { AlertCircle, AlertTriangle, CalendarClock } from 'lucide-react';
import { today as todayStr, addDays } from '../../lib/format';

const tomorrowStr = () => addDays(todayStr(), 1);

/**
 * DeadlineBadge — renders an urgency pill for a task due date.
 *
 * Skips rendering entirely when:
 *   - no dueDate is set
 *   - the task is in a terminal status (Completed / Blocked)
 *
 * @param {{ dueDate?: string, status?: string, size?: 'sm'|'md' }} props
 */
export default function DeadlineBadge({ dueDate, status, size = 'md' }) {
    if (!dueDate) return null;
    if (status === 'Completed' || status === 'Blocked') return null;

    const today = todayStr();
    const tomorrow = tomorrowStr();

    const padding = size === 'sm' ? 'px-1.5 py-0.5 text-3xs' : 'px-2 py-0.5 text-3xs';

    if (dueDate < today) {
        return (
            <span className={`flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 rounded border border-rose-500/20 ${padding}`}>
                <AlertCircle className="w-3 h-3" /> OVERDUE
            </span>
        );
    }
    if (dueDate === today) {
        return (
            <span className={`flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 rounded border border-amber-500/20 ${padding}`}>
                <AlertTriangle className="w-3 h-3" /> DUE TODAY
            </span>
        );
    }
    if (dueDate === tomorrow) {
        return (
            <span className={`flex items-center gap-1 font-bold text-yellow-400 bg-yellow-500/10 rounded border border-yellow-500/20 ${padding}`}>
                <CalendarClock className="w-3 h-3" /> DUE TOMORROW
            </span>
        );
    }
    return null;
}

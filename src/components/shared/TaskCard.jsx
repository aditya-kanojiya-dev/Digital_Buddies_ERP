import React from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';
import DeadlineBadge from './DeadlineBadge';

const todayStr = () => new Date().toISOString().split('T')[0];

/**
 * TaskCard — single source of truth for how a task renders across the app.
 *
 * Used by:
 *   - ManagerDashboard (with renderActions for ping/reassign)
 *   - Dashboard       (employee self-view)
 *   - Departments/*   (each department's task feed)
 *
 * Props:
 *   task:           the row from `state.tasks`
 *   assignee:       employee row (looked up from state.employees by parent)
 *   commentsCount:  number — pre-computed by parent to avoid re-walking state on every render
 *   currentUser:    session user (we don't gate on this here; parent decides what to show)
 *   viewMode:       'manager' | 'employee' | 'department' — only tweaks the default action surface
 *   onStatusChange: (taskId, nextStatus) => void
 *   onOpenDetail:   (task) => void
 *   renderActions:  optional (task) => ReactNode — for ManagerDashboard's ping/reassign compose boxes
 */
export default function TaskCard({
    task,
    assignee,
    commentsCount = 0,
    viewMode = 'employee',
    onStatusChange,
    onOpenDetail,
    renderActions,
}) {
    const isCompleted = task.status === 'Completed';
    const isOverdue   = !isCompleted && task.status !== 'Blocked' && task.dueDate && task.dueDate < todayStr();
    const isToday     = !isCompleted && task.status !== 'Blocked' && task.dueDate && task.dueDate === todayStr();

    const borderColor =
        isOverdue ? 'border-l-rose-500'
      : isToday   ? 'border-l-amber-500'
      :              'border-l-violet-500';

    const statusBadgeColor =
        task.status === 'Completed'  ? 'bg-emerald-500/10 text-emerald-400'
      : task.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400'
      : task.status === 'Review'      ? 'bg-amber-500/10 text-amber-400'
      : task.status === 'Blocked'     ? 'bg-rose-500/10 text-rose-400'
      :                                 'bg-violet-600/10 text-violet-400';

    const STATUS_PIPELINE = ['New', 'In Progress', 'Review', 'Completed'];

    return (
        <div className={`glass-card p-5 rounded-2xl flex flex-col gap-3 border-l-4 ${borderColor}`}>

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${statusBadgeColor}`}>
                            {task.status}
                        </span>
                        {task.priority && (
                            <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${
                                task.priority === 'Emergency' ? 'bg-red-600/20 text-red-400' :
                                task.priority === 'High'   ? 'bg-rose-500/10 text-rose-400' :
                                task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                                                              'bg-slate-700/40 text-slate-400'
                            }`}>
                                {task.priority}
                            </span>
                        )}
                        <span className="text-3xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.dueDate ? `Due: ${task.dueDate}` : 'No due date'}
                        </span>
                        {task.scheduledDate && (
                            <span className="text-3xs text-violet-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Prior: {task.scheduledDate}
                            </span>
                        )}
                        <DeadlineBadge dueDate={task.dueDate} status={task.status} size="sm" />
                    </div>

                    <button
                        onClick={() => onOpenDetail?.(task)}
                        className="block text-left w-full"
                    >
                        <h4 className="font-bold text-sm text-slate-100 hover:text-violet-300 transition">{task.title}</h4>
                    </button>

                    {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                    )}

                    <div className="text-3xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {assignee ? assignee.name : 'Unassigned'}
                        </span>
                        {task.department && (
                            <span className="text-slate-600">· {task.department}</span>
                        )}
                        {commentsCount > 0 && (
                            <span className="flex items-center gap-1 text-violet-400 font-semibold">
                                <MessageSquare className="w-3 h-3" /> {commentsCount} comment{commentsCount > 1 ? 's' : ''}
                            </span>
                        )}
                        {task.pinged > 0 && (
                            <span className="text-amber-400 font-bold">
                                · {task.pinged} ping{task.pinged > 1 ? 's' : ''} sent
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Action buttons (employee view) ── */}
                {viewMode === 'employee' && !isCompleted && !renderActions && (
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                        {task.status === 'New' || task.status === 'Assigned' ? (
                            <button
                                onClick={() => onStatusChange?.(task.id, 'In Progress')}
                                className="bg-violet-600/20 hover:bg-violet-650/40 text-violet-400 px-2.5 py-1 rounded-lg border border-violet-500/25 transition cursor-pointer font-bold text-3xs"
                            >
                                Start Work
                            </button>
                        ) : null}
                        {task.status === 'In Progress' && (
                            <button
                                onClick={() => onStatusChange?.(task.id, 'Review')}
                                className="bg-fuchsia-600/20 hover:bg-fuchsia-650/40 text-fuchsia-400 px-2.5 py-1 rounded-lg border border-fuchsia-500/25 transition cursor-pointer font-bold text-3xs"
                            >
                                Request Review
                            </button>
                        )}
                        {task.status === 'Review' && (
                            <button
                                onClick={() => onStatusChange?.(task.id, 'Completed')}
                                className="bg-emerald-600/20 hover:bg-emerald-650/40 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/25 transition cursor-pointer font-bold text-3xs"
                            >
                                Mark Done
                            </button>
                        )}
                        {!STATUS_PIPELINE.includes(task.status) && task.status !== 'Blocked' && (
                            <button
                                onClick={() => onStatusChange?.(task.id, 'In Progress')}
                                className="bg-blue-600/20 hover:bg-blue-650/40 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/25 transition cursor-pointer font-bold text-3xs"
                            >
                                In Progress
                            </button>
                        )}
                        <button
                            onClick={() => onStatusChange?.(task.id, 'Completed')}
                            className="bg-emerald-600/20 hover:bg-emerald-650/40 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/25 transition cursor-pointer font-bold text-3xs"
                        >
                            Complete
                        </button>
                    </div>
                )}

                {viewMode === 'employee' && isCompleted && !renderActions && (
                    <span className="px-3 py-1.5 rounded-xl text-2xs font-bold text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        ✔ Done
                    </span>
                )}
            </div>

            {/* ── Manager or department render slot ── */}
            {renderActions && renderActions(task)}
        </div>
    );
}

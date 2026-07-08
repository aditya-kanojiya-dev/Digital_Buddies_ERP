import React, { useState } from 'react';
import { X, MessageSquare, Send, Clock, User, CheckCircle2, CheckCircle, Edit2 } from 'lucide-react';
import { useToast } from './Toast';
import DeadlineBadge from './DeadlineBadge';
import { linkifyText } from '../../lib/format';

/**
 * TaskDetailPanel — slide-in side panel for a single task.
 *
 * Shows:
 *   - Header (title, status, assignee, deadline badge, due date, priority)
 *   - Comments thread (reads state.taskComments filtered by taskId)
 *   - Compose box — writes via updateState({ taskComments: [...] })
 *   - Status timeline (derived from comments + task fields; no new tables needed)
 *
 * Props:
 *   task:         the row from state.tasks
 *   state:        full app state (for comments + employees lookup)
 *   updateState:  from App.jsx — already wired to persist via DB_SAVE_MAP
 *   currentUser:  session user (for author + audit)
 *   onClose:      () => void
 */
export default function TaskDetailPanel({ task, state, updateState, currentUser, onClose }) {
    const toast = useToast();
    const [commentText, setCommentText] = useState('');
    const [statusEdit,  setStatusEdit]  = useState(task.status || 'New');

    const assignee = state.employees.find(e => e.id === task.assignedTo);

    const thread = (state.taskComments || [])
        .filter(c => c.taskId === task.id)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const STATUS_PIPELINE = ['New', 'In Progress', 'Review', 'Completed', 'Blocked'];

    const handlePostComment = (e) => {
        e.preventDefault();
        const text = commentText.trim();
        if (!text) return;
        const now = new Date().toISOString();
        const newComment = {
            id:        `CMT${Date.now()}`,
            taskId:    task.id,
            userId:    currentUser.id,
            comment:   text,
            createdAt: now,
        };
        updateState({ taskComments: [newComment, ...(state.taskComments || [])] });

        // Ping assignee if commenter is not the assignee themselves
        const commentNotifs = [];
        if (task.assignedTo && task.assignedTo !== currentUser.id) {
            commentNotifs.push({
                id:        `NTF${Date.now()}_a`,
                userId:    task.assignedTo,
                message:   `💬 ${currentUser.name} commented on "${task.title}": "${text.substring(0, 80)}${text.length > 80 ? '…' : ''}"`,
                type:      'comment',
                commentId: task.id,
                timestamp: now.replace('T', ' ').substring(0, 16),
                read:      false,
            });
        }
        if (task.assignedBy && task.assignedBy !== currentUser.id && task.assignedBy !== task.assignedTo) {
            commentNotifs.push({
                id:        `NTF${Date.now()}_b`,
                userId:    task.assignedBy,
                message:   `💬 ${currentUser.name} commented on "${task.title}": "${text.substring(0, 80)}${text.length > 80 ? '…' : ''}"`,
                type:      'comment',
                commentId: task.id,
                timestamp: now.replace('T', ' ').substring(0, 16),
                read:      false,
            });
        }
        if (commentNotifs.length) {
            updateState({ notifications: [...commentNotifs, ...(state.notifications || [])] });
        }
        setCommentText('');
        toast.success('Comment posted.');
    };

    const handleStatusChange = (nextStatus) => {
        if (nextStatus === task.status) return;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const statusNotifs = [];
        if (task.assignedBy && task.assignedBy !== currentUser.id) {
            statusNotifs.push({
                id:        `NTF${Date.now()}`,
                userId:    task.assignedBy,
                message:   `${currentUser.name} moved "${task.title}" from "${task.status}" to "${nextStatus}".`,
                type:      'info',
                timestamp: now,
                read:      false,
            });
        }
        updateState({
            tasks: (state.tasks || []).map(t =>
                t.id === task.id ? { ...t, status: nextStatus } : t
            ),
            notifications: [...statusNotifs, ...(state.notifications || [])],
            auditLogs: [{
                id:        `AUD${Date.now()}`,
                userId:    currentUser.id,
                action:    'Task Status Changed',
                details:   `${currentUser.name} moved "${task.title}" from "${task.status}" to "${nextStatus}" via detail panel.`,
                timestamp: now,
            }, ...(state.auditLogs || [])],
        });
        setStatusEdit(nextStatus);
        toast.success(`Status updated to ${nextStatus}.`);
    };

    // ── Review / Approval (assigner-only, when task is in Review) ──────────
    const isAssigner = currentUser.id === task.assignedBy;
    const canReview = isAssigner && task.status === 'Review';
    const [crText, setCrText] = useState('');
    const [showCrInput, setShowCrInput] = useState(false);

    const handleApprove = () => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
        updateState({
            tasks: (state.tasks || []).map(t =>
                t.id === task.id ? { ...t, status: 'Completed', approvedAt: now } : t
            ),
            notifications: [{
                id: `NTF${Date.now()}`,
                userId: task.assignedTo,
                message: `✅ ${currentUser.name} approved your task "${task.title}". Great work!`,
                type: 'info',
                timestamp: now,
                read: false,
            }, ...(state.notifications || [])],
            auditLogs: [{
                id: `AUD${Date.now()}`,
                userId: currentUser.id,
                action: 'Task Approved',
                details: `${currentUser.name} approved task "${task.title}" via detail panel.`,
                timestamp: now,
            }, ...(state.auditLogs || [])],
        });
        setStatusEdit('Completed');
        toast.success('Task approved and marked as completed.', `"${task.title}"`);
    };

    const handleRequestChanges = () => {
        const notes = crText.trim();
        if (!notes) {
            toast.warning('Please describe the changes needed.');
            return;
        }
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const revisionCount = (task.revisionCount || 0) + 1;
        updateState({
            tasks: (state.tasks || []).map(t =>
                t.id === task.id ? {
                    ...t,
                    status: 'In Progress',
                    revisionCount,
                    changeRequest: notes,
                    changeRequestedAt: now,
                } : t
            ),
            notifications: [{
                id: `NTF${Date.now()}`,
                userId: task.assignedTo,
                message: `🔄 ${currentUser.name} requested changes on "${task.title}" (revision ${revisionCount}): "${notes.substring(0, 100)}${notes.length > 100 ? '…' : ''}"`,
                type: 'info',
                timestamp: now,
                read: false,
            }, ...(state.notifications || [])],
            auditLogs: [{
                id: `AUD${Date.now()}`,
                userId: currentUser.id,
                action: 'Changes Requested',
                details: `${currentUser.name} requested changes on "${task.title}" (v${revisionCount}): ${notes}`,
                timestamp: now,
            }, ...(state.auditLogs || [])],
        });
        // Also add a comment
        updateState({
            taskComments: [{
                id: `CMT${Date.now()}`,
                taskId: task.id,
                userId: currentUser.id,
                comment: `🔄 Changes requested (revision ${revisionCount}): ${notes}`,
                createdAt: now,
            }, ...(state.taskComments || [])],
        });
        setCrText('');
        setShowCrInput(false);
        setStatusEdit('In Progress');
        toast.success('Change request sent to assignee.', `"${task.title}"`);
    };

    // Build a simple timeline from comments + the task's own createdAt
    const timeline = [
        { ts: task.createdAt, label: 'Task created', who: 'system' },
        ...thread.map(c => ({
            ts: c.createdAt,
            label: c.comment,
            who: c.userId,
        })),
    ].sort((a, b) => new Date(a.ts) - new Date(b.ts));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Panel */}
            <aside
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[90dvh] glass-panel border border-violet-500/15 z-10 flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-fade-in"
            >

                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 flex-shrink-0">
                    <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-3xs bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded font-mono font-semibold">
                                {task.status}
                            </span>
                            {task.priority && (
                                <span className="text-3xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-semibold">
                                    {task.priority} priority
                                </span>
                            )}
                            <DeadlineBadge dueDate={task.dueDate} status={task.status} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-100">{task.title}</h3>
                        {task.description && (
                            <p className="text-xs text-slate-400">{linkifyText(task.description)}</p>
                        )}
                        <div className="text-3xs text-slate-500 flex flex-wrap items-center gap-2 pt-1">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {assignee ? assignee.name : 'Unassigned'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.dueDate || 'No due date'}</span>
                            {task.department && (
                                <>
                                    <span>·</span>
                                    <span>{task.department}</span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-1.5 pt-3">
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                    `📎 *Asset Request - Task #${task.id}*\n*Task:* ${task.title}\n*Due:* ${task.dueDate || 'N/A'}\n\nPlease share the required assets/content for this task.`
                                )}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex-1 bg-green-600/10 hover:bg-green-600/20 text-green-400 text-3xs font-semibold py-1.5 rounded-lg border border-green-500/15 transition flex items-center justify-center gap-1"
                            >
                                <Send className="w-3 h-3" /> Share Assets
                            </a>
                            {(task.status === 'Review' || task.status === 'Completed') && (
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(
                                        `✅ *Submission - Task #${task.id}*\n*Task:* ${task.title}\n*Due:* ${task.dueDate || 'N/A'}\n\nWork has been completed. Please find the deliverables attached.`
                                    )}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-3xs font-semibold py-1.5 rounded-lg border border-emerald-500/15 transition flex items-center justify-center gap-1"
                                >
                                    Submit on WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                    <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-200 transition p-1 flex-shrink-0"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Status pipeline (everyone can move status, app-level role rules apply in parent components) */}
                    <div>
                        <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Status</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_PIPELINE.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusChange(s)}
                                    className={`px-2.5 py-1 rounded-lg text-3xs font-bold transition ${
                                        statusEdit === s
                                            ? 'bg-violet-600 text-white border border-violet-600'
                                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                    }`}
                                >
                                    {s === statusEdit && <CheckCircle2 className="w-3 h-3 inline -ml-0.5 mr-1" />}
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Review / Approval (shown to the assigner when task is in Review) */}
                    {canReview && !showCrInput && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                            <p className="text-2xs font-semibold text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Task is in Review — your action
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleApprove}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button onClick={() => setShowCrInput(true)}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Edit2 className="w-4 h-4" /> Request Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {canReview && showCrInput && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                            <p className="text-2xs font-semibold text-amber-300">Describe the changes needed</p>
                            <textarea value={crText} onChange={e => setCrText(e.target.value)}
                                className="w-full glass-input p-2.5 rounded-lg text-xs h-20 resize-none"
                                placeholder="Be specific about what needs to change..."
                                maxLength={500}
                            />
                            <p className="text-3xs text-slate-500 text-right">{crText.length}/500</p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => { setShowCrInput(false); setCrText(''); }}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-semibold cursor-pointer transition">
                                    Cancel
                                </button>
                                <button onClick={handleRequestChanges} disabled={!crText.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-2xs font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Edit2 className="w-3 h-3" /> Send Change Request
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Comments thread */}
                    <div>
                        <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-3 font-semibold flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-violet-400" /> Conversation
                            <span className="text-slate-600">({thread.length})</span>
                        </h4>
                        <div className="space-y-3">
                            {thread.length === 0 ? (
                                <p className="text-xs text-slate-600 italic text-center py-4 border border-dashed border-slate-800 rounded-xl">
                                    No comments yet — start the conversation.
                                </p>
                            ) : (
                                thread.map(c => {
                                    const author = state.employees.find(e => e.id === c.userId);
                                    const initials = (author?.name || currentUser.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                                    return (
                                        <div key={c.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-650 flex items-center justify-center font-bold text-3xs text-white flex-shrink-0">
                                                {initials}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-slate-200">{author?.name || currentUser.name}</span>
                                                    <span className="text-3xs text-slate-600">{new Date(c.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{c.comment}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">Activity Timeline</h4>
                        <ol className="space-y-2">
                            {timeline.map((evt, i) => {
                                const author = state.employees.find(e => e.id === evt.who);
                                return (
                                    <li key={i} className="flex gap-3 text-3xs">
                                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-slate-300">{evt.label}</p>
                                            <p className="text-slate-600">
                                                {author?.name || (evt.who === 'system' ? 'System' : evt.who)} · {new Date(evt.ts).toLocaleString()}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>

                {/* Compose — pinned to bottom */}
                <form
                    onSubmit={handlePostComment}
                    className="p-4 border-t border-slate-800 flex gap-2 flex-shrink-0"
                >
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 glass-input p-2.5 rounded-xl text-xs"
                        placeholder="Add a comment or status note…"
                    />
                    <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="bg-neon-gradient px-3 py-2 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 text-xs font-bold"
                    >
                        <Send className="w-3.5 h-3.5" />
                        Send
                    </button>
                </form>
            </aside>
        </div>
    );
}

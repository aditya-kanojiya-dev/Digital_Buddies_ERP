import React, { useState } from 'react';
import { X, Clock, User, CheckCircle2, CheckCircle, Edit2 } from 'lucide-react';
import { useToast } from './Toast';
import DeadlineBadge from './DeadlineBadge';

export default function TaskDetailPanel({ task, state, updateState, currentUser, onClose }) {
    const toast = useToast();
    const [statusEdit, setStatusEdit] = useState(task.status || 'New');

    const assignee = state.employees.find(e => e.id === task.assignedTo);

    const STATUS_PIPELINE = ['New', 'In Progress', 'Review', 'Completed', 'Blocked'];

    const handleStatusChange = (nextStatus) => {
        if (nextStatus === task.status) return;
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const statusNotifs = [];
        if (task.assignedBy && task.assignedBy !== currentUser.id) {
            statusNotifs.push({
                id: `NTF${Date.now()}`,
                userId: task.assignedBy,
                message: `${currentUser.name} moved "${task.title}" from "${task.status}" to "${nextStatus}".`,
                type: 'info',
                timestamp: now,
                read: false,
            });
        }
        updateState({
            tasks: (state.tasks || []).map(t =>
                t.id === task.id ? { ...t, status: nextStatus } : t
            ),
            notifications: [...statusNotifs, ...(state.notifications || [])],
            auditLogs: [{
                id: `AUD${Date.now()}`,
                userId: currentUser.id,
                action: 'Task Status Changed',
                details: `${currentUser.name} moved "${task.title}" from "${task.status}" to "${nextStatus}" via detail panel.`,
                timestamp: now,
            }, ...(state.auditLogs || [])],
        });
        setStatusEdit(nextStatus);
        toast.success(`Status updated to ${nextStatus}.`);
    };

    // ── Review / Approval ──
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
        setCrText('');
        setShowCrInput(false);
        setStatusEdit('In Progress');
        toast.success('Change request sent to assignee.', `"${task.title}"`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <aside
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[90dvh] glass-panel border border-violet-500/15 z-10 flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-fade-in"
            >
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
                        <div className="text-3xs text-slate-500 flex flex-wrap items-center gap-2 pt-1">
                            <span className="font-mono text-violet-400 font-semibold">{task.id}</span>
                            <span className="text-slate-600">·</span>
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
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-200 transition p-1 flex-shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                </div>
            </aside>
        </div>
    );
}

import React, { useState } from 'react';
import {
    X, Clock, User, CheckCircle2, CheckCircle, Edit2,
    Calendar, CalendarCheck, CalendarClock, Link as LinkIcon,
    AlertCircle, GitBranch, ClockAlert,
} from 'lucide-react';
import { useToast } from './Toast';
import DeadlineBadge from './DeadlineBadge';

const DEPT_DOT = {
    'Paid Ads':               'bg-orange-500',
    'Social Media':           'bg-fuchsia-500',
    'Video Editors':          'bg-red-500',
    'Graphic Designers':      'bg-pink-500',
    'Videography/Photography':'bg-teal-500',
    'Developers':             'bg-blue-500',
    'HR':                     'bg-emerald-500',
};

const PRIORITY_STYLES = {
    Emergency: 'bg-red-500/15 text-red-400 border-red-500/25',
    High:      'bg-rose-500/15 text-rose-400 border-rose-500/25',
    Medium:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
    Low:       'bg-slate-600/30 text-slate-400 border-slate-600/25',
};

export default function TaskDetailPanel({ task, state, updateState, currentUser, onClose }) {
    const toast = useToast();
    const [statusEdit, setStatusEdit] = useState(task.status || 'New');

    const assignee = state.employees.find(e => e.id === task.assignedTo);
    const assigner = state.employees.find(e => e.id === task.assignedBy);

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

    const sourceDeptColor = DEPT_DOT[task.sourceDept] || 'bg-slate-500';
    const isVideography = task.department === 'Videography/Photography';
    const hasReschedule = task.rescheduleRequest;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <aside
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[90dvh] glass-panel border border-violet-500/15 z-10 flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-fade-in"
            >
                {/* ── Header ── */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 flex-shrink-0">
                    <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-3xs bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded font-mono font-semibold">
                                {task.status}
                            </span>
                            {task.priority && (
                                <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>
                                    {task.priority}
                                </span>
                            )}
                            <DeadlineBadge dueDate={task.dueDate} status={task.status} />
                        </div>
                        <h3 className="font-bold text-lg text-slate-100">{task.title}</h3>
                        <div className="text-3xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-violet-400 font-semibold">{task.id}</span>
                            {task.department && (
                                <>
                                    <span className="text-slate-600">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${DEPT_DOT[task.department] || 'bg-slate-500'}`} />
                                        {task.department}
                                    </span>
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

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* ── People ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-card rounded-xl p-3 border border-slate-800/60">
                            <p className="text-3xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Assigned By</p>
                            {assigner ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-3xs font-bold text-slate-300">
                                        {assigner.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">{assigner.name}</p>
                                        <p className="text-3xs text-slate-500">{assigner.role || 'Team Member'}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">System / Unknown</p>
                            )}
                        </div>
                        <div className="glass-card rounded-xl p-3 border border-slate-800/60">
                            <p className="text-3xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Assigned To</p>
                            {assignee ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center text-3xs font-bold text-teal-400">
                                        {assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200">{assignee.name}</p>
                                        <p className="text-3xs text-slate-500">{assignee.department?.join(', ') || 'No department'}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 italic">Unassigned</p>
                            )}
                        </div>
                    </div>

                    {/* ── Source department ── */}
                    {task.sourceDept && task.sourceDept !== task.department && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800/40">
                            <span className={`w-2 h-2 rounded-full ${sourceDeptColor}`} />
                            <span className="text-xs text-slate-400">
                                Originated from <span className="font-semibold text-slate-300">{task.sourceDept}</span> department
                            </span>
                        </div>
                    )}

                    {/* ── Shoot approval status (Videography only) ── */}
                    {isVideography && task.sourceDept === 'Social Media' && (
                        <div className={`rounded-xl p-3 border ${
                            task.shootApprovalStatus === 'approved'
                                ? 'bg-teal-500/5 border-teal-500/20'
                                : task.shootApprovalStatus === 'reschedule_requested'
                                ? 'bg-amber-500/5 border-amber-500/20'
                                : 'bg-orange-500/5 border-orange-500/20'
                        }`}>
                            <div className="flex items-center gap-2 mb-1">
                                {task.shootApprovalStatus === 'approved' ? (
                                    <CalendarCheck className="w-4 h-4 text-teal-400" />
                                ) : task.shootApprovalStatus === 'reschedule_requested' ? (
                                    <CalendarClock className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <CalendarClock className="w-4 h-4 text-orange-400" />
                                )}
                                <span className={`text-xs font-bold ${
                                    task.shootApprovalStatus === 'approved' ? 'text-teal-300' :
                                    task.shootApprovalStatus === 'reschedule_requested' ? 'text-amber-300' :
                                    'text-orange-300'
                                }`}>
                                    {task.shootApprovalStatus === 'approved' ? 'Shoot Date Approved' :
                                     task.shootApprovalStatus === 'reschedule_requested' ? 'Reschedule Requested' :
                                     'Awaiting Shoot Approval'}
                                </span>
                            </div>
                            {hasReschedule && (
                                <div className="mt-2 space-y-1 ml-6">
                                    <p className="text-xs text-slate-300">
                                        Proposed new date: <span className="font-semibold text-amber-300">{task.rescheduleRequest.proposedDate}</span>
                                    </p>
                                    <p className="text-xs text-slate-400 italic">"{task.rescheduleRequest.reason}"</p>
                                    <p className="text-3xs text-slate-500">by {task.rescheduleRequest.requestedByName}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Dates ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-card rounded-xl p-3 border border-slate-800/60">
                            <p className="text-3xs text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due Date
                            </p>
                            <p className={`text-sm font-bold ${task.dueDate ? 'text-slate-200' : 'text-slate-500 italic'}`}>
                                {task.dueDate || 'No due date'}
                            </p>
                        </div>
                        {task.scheduledDate && (
                            <div className="glass-card rounded-xl p-3 border border-slate-800/60">
                                <p className="text-3xs text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Post Date
                                </p>
                                <p className="text-sm font-bold text-slate-200">{task.scheduledDate}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Description ── */}
                    {task.description && (
                        <div>
                            <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Description</h4>
                            <div className="glass-card rounded-xl p-3 border border-slate-800/60">
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{task.description}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Attachment ── */}
                    {task.attachmentUrl && (
                        <div>
                            <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Attachment</h4>
                            <a
                                href={task.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-card rounded-xl p-3 border border-slate-800/60 flex items-center gap-2 hover:border-fuchsia-500/30 transition group"
                            >
                                <div className="p-2 rounded-lg bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20 transition">
                                    <LinkIcon className="w-4 h-4 text-fuchsia-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-fuchsia-400 font-semibold truncate">{task.attachmentUrl}</p>
                                    <p className="text-3xs text-slate-500">Click to open in new tab</p>
                                </div>
                            </a>
                        </div>
                    )}

                    {/* ── Revision history ── */}
                    {task.revisionCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
                            <GitBranch className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-300 font-semibold">
                                Revision {task.revisionCount}
                                {task.changeRequest && (
                                    <span className="text-slate-500 font-normal ml-1">— "{task.changeRequest.substring(0, 60)}{task.changeRequest.length > 60 ? '…' : ''}"</span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* ── Delay history ── */}
                    {task.isDelayed && task.delayHistory && task.delayHistory.length > 0 && (
                        <div>
                            <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold flex items-center gap-1.5">
                                <ClockAlert className="w-3 h-3 text-rose-400" />
                                Delay History ({task.delayCount} time{task.delayCount !== 1 ? 's' : ''})
                            </h4>
                            <div className="space-y-2">
                                {[...task.delayHistory].reverse().map((d, i) => (
                                    <div key={i} className="glass-card rounded-xl p-3 border border-rose-500/15 bg-rose-500/5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-rose-300">
                                                Delay #{task.delayHistory.length - i}
                                            </span>
                                            <span className="text-3xs text-slate-500">
                                                {d.reportedAt?.split(' ')[0] || 'Unknown date'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                            <span className="line-through text-slate-500">{d.previousDueDate}</span>
                                            <span className="text-rose-400">→</span>
                                            <span className="font-semibold text-slate-200">{d.newDueDate}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 italic leading-relaxed">"{d.reason}"</p>
                                        <p className="text-3xs text-slate-500 mt-1">by {d.reportedByName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Status ── */}
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

                    {/* ── Review / Approval ── */}
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

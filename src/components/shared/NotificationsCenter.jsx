import React, { useState, useMemo } from 'react';
import { Bell, BellOff, Check, CheckCheck, ArrowRight, Filter } from 'lucide-react';
import { useToast } from './Toast';

const TYPE_LABELS = {
    'assignment':         'Assignment',
    'ping':               'Ping',
    'comment':            'Comment',
    'deadline-overdue':   'Overdue',
    'deadline-today':     'Due Today',
    'deadline-24h':       'Due Tomorrow',
    'info':               'Info',
};

const TYPE_COLORS = {
    'assignment':         'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'ping':               'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'comment':            'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'deadline-overdue':   'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'deadline-today':     'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'deadline-24h':       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'info':               'bg-slate-700/40 text-slate-300 border-slate-600/40',
};

const FILTER_TYPES = ['all', 'unread', 'assignment', 'ping', 'comment', 'deadline-overdue', 'deadline-today', 'deadline-24h'];

export default function NotificationsCenter({ state, updateState, user, onNotifNavigate }) {
    const toast = useToast();
    const [filter, setFilter] = useState('all');

    const myNotifs = useMemo(
        () => (state.notifications || []).filter(n => n.userId === user.id),
        [state.notifications, user.id]
    );

    const filtered = useMemo(() => {
        if (filter === 'all') return myNotifs;
        if (filter === 'unread') return myNotifs.filter(n => !n.read);
        return myNotifs.filter(n => n.type === filter);
    }, [myNotifs, filter]);

    const unreadCount = myNotifs.filter(n => !n.read).length;

    const handleMarkOne = (id) => {
        const updated = (state.notifications || []).map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        updateState({ notifications: updated });
    };

    const handleMarkAll = () => {
        const updated = (state.notifications || []).map(n =>
            n.userId === user.id ? { ...n, read: true } : n
        );
        updateState({ notifications: updated });
        toast.success('All notifications marked as read.');
    };

    const handleOpen = (n) => {
        handleMarkOne(n.id);
        onNotifNavigate?.(n);
    };

    return (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" /> Notifications
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400">
                        {unreadCount} unread of {myNotifs.length} total
                    </p>
                </div>
                <button
                    onClick={handleMarkAll}
                    disabled={unreadCount === 0}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                    <CheckCheck className="w-4 h-4 text-emerald-400" /> Mark all read
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mr-1">
                    <Filter className="w-3.5 h-3.5" />
                </span>
                {FILTER_TYPES.map(f => {
                    const count = f === 'all' ? myNotifs.length
                                : f === 'unread' ? unreadCount
                                : myNotifs.filter(n => n.type === f).length;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-3xs font-bold uppercase tracking-wider transition-all duration-150 ${
                                filter === f
                                    ? 'bg-violet-600 text-white border border-violet-600'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {f === 'all' ? 'All' : (TYPE_LABELS[f] || f)} <span className="opacity-60">({count})</span>
                        </button>
                    );
                })}
            </div>

            <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 sm:py-12 space-y-2">
                        <BellOff className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600 mx-auto" />
                        <p className="text-slate-500 text-xs sm:text-sm">
                            {filter === 'unread'
                                ? 'No unread notifications.'
                                : 'No notifications matching this filter.'}
                        </p>
                    </div>
                ) : (
                    filtered
                        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
                        .map(n => {
                            const typeClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                            const typeLabel = TYPE_LABELS[n.type] || 'Info';
                            return (
                                <div
                                    key={n.id}
                                    className={`p-3 sm:p-4 rounded-xl flex items-start gap-3 sm:gap-4 border ${
                                        n.read
                                            ? 'bg-slate-950/30 border-slate-900'
                                            : 'bg-violet-650/8 border-violet-500/20'
                                    }`}
                                >
                                    <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-700' : 'bg-violet-400'}`} />

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-3xs px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${typeClass}`}>
                                                {typeLabel}
                                            </span>
                                            <span className="text-3xs text-slate-500 font-mono">{n.timestamp}</span>
                                        </div>
                                        <p className={`text-xs sm:text-sm ${n.read ? 'text-slate-400' : 'text-slate-200'}`}>
                                            {n.message}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                                        <button
                                            onClick={() => handleOpen(n)}
                                            className="bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1 rounded-lg text-3xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            Open <ArrowRight className="w-3 h-3" />
                                        </button>
                                        {!n.read && (
                                            <button
                                                onClick={() => handleMarkOne(n.id)}
                                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-3xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                <Check className="w-3 h-3" /> Read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}

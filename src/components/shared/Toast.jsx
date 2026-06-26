import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
const ToastContext = createContext(null);

// ─────────────────────────────────────────────
// Config per type
// ─────────────────────────────────────────────
const TYPES = {
    success: {
        icon: CheckCircle2,
        bar: 'bg-emerald-500',
        icon_cls: 'text-emerald-400',
        border: 'border-emerald-500/20',
        glow: 'shadow-emerald-500/10',
    },
    error: {
        icon: XCircle,
        bar: 'bg-rose-500',
        icon_cls: 'text-rose-400',
        border: 'border-rose-500/20',
        glow: 'shadow-rose-500/10',
    },
    warning: {
        icon: AlertTriangle,
        bar: 'bg-amber-500',
        icon_cls: 'text-amber-400',
        border: 'border-amber-500/20',
        glow: 'shadow-amber-500/10',
    },
    info: {
        icon: Info,
        bar: 'bg-violet-500',
        icon_cls: 'text-violet-400',
        border: 'border-violet-500/20',
        glow: 'shadow-violet-500/10',
    },
};

const DURATION = 3500; // ms before auto-dismiss

// ─────────────────────────────────────────────
// Single Toast Item
// ─────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
    const cfg = TYPES[toast.type] || TYPES.info;
    const Icon = cfg.icon;

    return (
        <div
            className={`
        relative flex items-start gap-3 w-80 p-4 rounded-2xl
        border ${cfg.border}
        shadow-xl ${cfg.glow}
        animate-toast-in
        overflow-hidden
      `}
            style={{
                background: 'rgba(18, 12, 36, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            {/* Progress bar */}
            <div
                className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} animate-toast-bar`}
                style={{ animationDuration: `${DURATION}ms` }}
            />

            {/* Icon */}
            <div className={`flex-shrink-0 mt-0.5 ${cfg.icon_cls}`}>
                <Icon className="w-4 h-4" />
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className="text-xs font-semibold text-slate-100 mb-0.5">{toast.title}</p>
                )}
                <p className="text-xs text-slate-300 leading-relaxed">{toast.message}</p>
            </div>

            {/* Close button */}
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const remove = useCallback((id) => {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const add = useCallback((type, message, title) => {
        const id = `toast_${Date.now()}_${Math.random()}`;
        setToasts(prev => [...prev, { id, type, message, title }]);
        timers.current[id] = setTimeout(() => remove(id), DURATION);
        return id;
    }, [remove]);

    const toast = {
        success: (message, title) => add('success', message, title),
        error: (message, title) => add('error', message, title),
        warning: (message, title) => add('warning', message, title),
        info: (message, title) => add('info', message, title),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Toast stack — fixed bottom-right */}
            {toasts.length > 0 && (
                <div
                    className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5"
                    style={{ pointerEvents: 'none' }}
                >
                    {toasts.map(t => (
                        <div key={t.id} style={{ pointerEvents: 'auto' }}>
                            <ToastItem toast={t} onRemove={remove} />
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}
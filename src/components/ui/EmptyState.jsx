import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState — friendly placeholder for empty lists/sections.
 *
 * Props:
 *   icon: LucideIcon (default Inbox)
 *   title, message
 *   action: node (e.g. a "Create" button)
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-300 mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-bold text-slate-200">{title}</h4>
      {message && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

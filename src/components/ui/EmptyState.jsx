

import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 sm:py-14 px-4 sm:px-6 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-300 mb-4 ring-1 ring-violet-500/10">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>
      <h4 className="text-sm font-bold text-slate-200">{title}</h4>
      {message && (
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

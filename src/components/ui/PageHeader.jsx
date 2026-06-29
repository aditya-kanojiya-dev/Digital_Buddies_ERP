import React from 'react';

/**
 * PageHeader — consistent title block for every page/module.
 *
 * Props:
 *   icon: LucideIcon (rendered in a gradient chip)
 *   title, subtitle
 *   actions: node rendered right-aligned (buttons, filters)
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="bg-neon-gradient p-2.5 rounded-xl text-white shadow-lg shadow-fuchsia-600/20 flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-100 truncate">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

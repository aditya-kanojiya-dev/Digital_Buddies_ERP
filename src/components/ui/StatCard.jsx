import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * StatCard — KPI tile with icon, value, label and optional trend / sparkline.
 *
 * Props:
 *   icon: LucideIcon
 *   label, value: primary content
 *   tone: accent color for the icon chip (violet|emerald|amber|rose|sky)
 *   trend: number (+/-) → shows up/down delta
 *   trendLabel: string under the trend
 *   onClick: makes the card interactive
 *   children: optional footer (e.g. a <Sparkline/>)
 */
const TONES = {
  violet: 'bg-violet-500/15 text-violet-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  rose: 'bg-rose-500/15 text-rose-300',
  sky: 'bg-sky-500/15 text-sky-300',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'violet',
  trend,
  trendLabel,
  onClick,
  children,
  className = '',
}) {
  const up = typeof trend === 'number' && trend >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 truncate">{label}</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1 tracking-tight">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${TONES[tone] || TONES.violet}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {typeof trend === 'number' && (
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${
              up ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </span>
          {trendLabel && <span className="text-[0.7rem] text-slate-500">{trendLabel}</span>}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

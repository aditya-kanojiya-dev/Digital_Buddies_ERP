import React from 'react';

/**
 * ProgressRing — single-value circular progress (0–100). Dependency-free SVG.
 *
 * Props:
 *   value: 0–100
 *   size: px (default 88)
 *   thickness: ring width (default 8)
 *   color: progress color
 *   label: small text under the percentage (optional)
 */
export default function ProgressRing({
  value = 0,
  size = 88,
  thickness = 8,
  color = '#a78bfa',
  label,
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const cx = size / 2;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={thickness}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold text-slate-100">{Math.round(pct)}%</span>
        {label && <span className="text-[0.6rem] text-slate-500">{label}</span>}
      </div>
    </div>
  );
}

import React, { useState } from 'react';

/**
 * BarChart — vertical bars with labels and hover tooltip. Dependency-free SVG.
 *
 * Props:
 *   data: [{ label, value, color? }]
 *   height: px (default 220)
 *   color: default bar color
 *   formatValue: (n) => string
 */
export default function BarChart({
  data = [],
  height = 220,
  color = '#a78bfa',
  formatValue = (n) => n,
}) {
  const [hover, setHover] = useState(null);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-500"
        style={{ height }}
      >
        No data to display
      </div>
    );
  }

  const W = 600;
  const H = height;
  const padL = 40;
  const padB = 28;
  const padT = 12;
  const plotW = W - padL - 12;
  const plotH = H - padB - padT;

  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.6, 48);

  const ticks = Array.from({ length: 4 }, (_, i) => (max / 3) * i);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {ticks.map((t, i) => {
          const yy = padT + plotH - (t / max) * plotH;
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={yy}
                y2={yy}
                stroke="rgba(148,163,184,0.12)"
              />
              <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize="9" fill="#64748b">
                {formatValue(Math.round(t))}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const bx = padL + i * slot + (slot - barW) / 2;
          const by = padT + plotH - h;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={bx}
                y={by}
                width={barW}
                height={Math.max(h, 1)}
                rx="5"
                fill={d.color || color}
                opacity={hover === null || hover === i ? 1 : 0.5}
                style={{ transition: 'opacity 0.15s' }}
              />
              <text
                x={bx + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none glass-panel border border-violet-500/25 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
          <span className="text-slate-400 text-[0.65rem]">{data[hover].label}: </span>
          <span className="font-bold text-slate-100">{formatValue(data[hover].value)}</span>
        </div>
      )}
    </div>
  );
}

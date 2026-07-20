import { useState } from 'react';

/**
 * LineChart — responsive single-series line/area chart with axis labels,
 * gridlines and hover tooltip. Dependency-free SVG.
 *
 * Props:
 *   data: [{ label: string, value: number }]
 *   height: number (px, default 220)
 *   color: stroke color
 *   formatValue: (n) => string  (tooltip + y-axis)
 */
export default function LineChart({
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
  const padL = 44;
  const padB = 28;
  const padT = 12;
  const padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padB - padT;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const x = (i) =>
    padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const y = (v) => padT + plotH - ((v - min) / range) * plotH;

  const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPts = `${padL},${padT + plotH} ${linePts} ${padL + plotW},${padT + plotH}`;

  // 4 horizontal gridlines
  const ticks = Array.from({ length: 4 }, (_, i) => min + (range / 3) * i);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={padL + plotW}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={y(t) + 3}
              textAnchor="end"
              fontSize="9"
              fill="#64748b"
            >
              {formatValue(Math.round(t))}
            </text>
          </g>
        ))}

        <polygon points={areaPts} fill="url(#lc-fill)" />
        <polyline
          points={linePts}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* points + hover targets + x labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(d.value)}
              r={hover === i ? 5 : 3}
              fill={color}
              stroke="#0c0817"
              strokeWidth="2"
            />
            <rect
              x={x(i) - plotW / data.length / 2}
              y={padT}
              width={plotW / data.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            <text
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none glass-panel border border-violet-500/25 rounded-lg px-2.5 py-1.5 text-xs shadow-xl"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(data[hover].value) / H) * 100}%`,
          }}
        >
          <div className="text-slate-400 text-2xs">{data[hover].label}</div>
          <div className="font-bold text-slate-100">
            {formatValue(data[hover].value)}
          </div>
        </div>
      )}
    </div>
  );
}

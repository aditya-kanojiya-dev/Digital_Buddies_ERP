

/**
 * DonutChart — proportional ring with center total + legend.
 * Dependency-free SVG.
 *
 * Props:
 *   data: [{ label, value, color }]
 *   size: px (default 160)
 *   thickness: ring width (default 22)
 *   centerLabel: text under the total (optional)
 */
const PALETTE = ['#a78bfa', '#f0abfc', '#38bdf8', '#34d399', '#fbbf24', '#fb7185'];

export default function DonutChart({
  data = [],
  size = 160,
  thickness = 22,
  centerLabel,
}) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  let offset = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="rgba(148,163,184,0.1)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            items.map((d, i) => {
              const frac = d.value / total;
              const len = frac * c;
              const seg = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={d.color || PALETTE[i % PALETTE.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-slate-100">{total}</span>
          {centerLabel && (
            <span className="text-2xs text-slate-500">{centerLabel}</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: d.color || PALETTE[i % PALETTE.length] }}
            />
            <span className="text-slate-400">{d.label}</span>
            <span className="font-bold text-slate-200 ml-auto pl-3">{d.value}</span>
          </div>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-slate-500">No data</span>
        )}
      </div>
    </div>
  );
}

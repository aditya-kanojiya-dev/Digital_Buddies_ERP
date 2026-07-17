

/**
 * Sparkline — tiny inline trend line (no axes). Dependency-free SVG.
 * Props: data: number[], width, height, color, fill (boolean)
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 36,
  color = '#a78bfa',
  fill = true,
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const id = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${id})`} />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

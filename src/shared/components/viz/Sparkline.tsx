/**
 * Sparkline - SVG sparkline for trend data
 *
 * Pure SVG polyline, no axes, no chrome - just the data line.
 * Follows Aicher design rules: 2px stroke, no border-radius, palette colors only.
 */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = 'var(--aicher-blue)',
  showDots = false,
  className = '',
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * innerWidth;
    const y = padding + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const lastPoint = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Sparkline chart"
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showDots && points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />)}
      {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />}
    </svg>
  );
}

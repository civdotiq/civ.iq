/**
 * DotPlot - SVG dot plot for comparing values
 *
 * Horizontal scale with labeled dots for comparing representatives,
 * voting scores, or other comparable metrics.
 * Follows Aicher design rules: 2px stroke, no border-radius, palette colors only.
 */

interface DotPlotItem {
  label: string;
  value: number;
  color?: string;
}

interface DotPlotProps {
  items: DotPlotItem[];
  maxValue?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function DotPlot({ items, maxValue, width = 300, height, className = '' }: DotPlotProps) {
  if (items.length === 0) return null;

  const resolvedMax = maxValue ?? Math.max(...items.map(i => i.value));
  const rowHeight = 28;
  const labelWidth = 80;
  const dotAreaWidth = width - labelWidth - 24;
  const computedHeight = height ?? items.length * rowHeight + 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${computedHeight}`}
      width={width}
      height={computedHeight}
      className={className}
      role="img"
      aria-label="Dot plot chart"
    >
      {/* Scale line */}
      <line
        x1={labelWidth}
        y1={4}
        x2={labelWidth}
        y2={computedHeight - 4}
        stroke="var(--border-color, #000000)"
        strokeWidth={2}
      />

      {items.map((item, index) => {
        const y = index * rowHeight + rowHeight / 2 + 4;
        const dotX = labelWidth + (item.value / (resolvedMax || 1)) * dotAreaWidth;
        const dotColor = item.color ?? 'var(--aicher-blue)';

        return (
          <g key={index}>
            {/* Label */}
            <text
              x={labelWidth - 8}
              y={y + 1}
              textAnchor="end"
              dominantBaseline="middle"
              fill="currentColor"
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-primary)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
              }}
            >
              {item.label}
            </text>

            {/* Connecting line */}
            <line
              x1={labelWidth + 2}
              y1={y}
              x2={dotX}
              y2={y}
              stroke={dotColor}
              strokeWidth={1}
              opacity={0.3}
            />

            {/* Dot */}
            <circle cx={dotX} cy={y} r={5} fill={dotColor} />

            {/* Value label */}
            <text
              x={dotX + 10}
              y={y + 1}
              dominantBaseline="middle"
              fill="currentColor"
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-primary)',
                fontWeight: 600,
              }}
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

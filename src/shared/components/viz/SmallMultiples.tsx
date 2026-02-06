/**
 * SmallMultiples - Grid of mini sparkline charts
 *
 * Renders a grid of sparklines with labels for cross-district
 * or cross-time comparison.
 * Follows Aicher design rules: 2px stroke, no border-radius, palette colors only.
 */

import { Sparkline } from './Sparkline';

interface SmallMultiplesItem {
  label: string;
  values: number[];
  color?: string;
}

interface SmallMultiplesProps {
  data: SmallMultiplesItem[];
  columns?: number;
  sparklineWidth?: number;
  sparklineHeight?: number;
  className?: string;
}

export function SmallMultiples({
  data,
  columns = 3,
  sparklineWidth = 100,
  sparklineHeight = 28,
  className = '',
}: SmallMultiplesProps) {
  if (data.length === 0) return null;

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 'calc(var(--grid, 8px) * 2)',
      }}
      role="img"
      aria-label="Small multiples chart grid"
    >
      {data.map((item, index) => (
        <div key={index} style={{ minWidth: 0 }}>
          <div
            className="aicher-label"
            style={{
              marginBottom: 'calc(var(--grid, 8px) * 0.5)',
              color: 'var(--color-info, #6b7280)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={item.label}
          >
            {item.label}
          </div>
          <Sparkline
            data={item.values}
            width={sparklineWidth}
            height={sparklineHeight}
            color={item.color ?? 'var(--aicher-blue)'}
          />
        </div>
      ))}
    </div>
  );
}

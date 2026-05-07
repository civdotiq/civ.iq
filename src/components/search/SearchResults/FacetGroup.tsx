import { CqLabel } from '@/components/cq';

interface FacetGroupProps {
  title: string;
  options: ReadonlyArray<readonly [string, number]>;
}

export function FacetGroup({ title, options }: FacetGroupProps) {
  return (
    <div>
      <CqLabel color="ink">{title}</CqLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' }}>
        {options.map(([label, count]) => (
          <label
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              padding: '5px 0',
              cursor: 'pointer',
              color: 'var(--fg1)',
            }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  border: '2px solid var(--ink)',
                  display: 'inline-block',
                }}
              />
              {label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

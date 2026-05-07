import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import { FacetGroup } from './FacetGroup';

type FacetKey = 'all' | 'officials' | 'bills' | 'committees';

interface FacetRailProps {
  query: string;
  active: FacetKey;
  counts: Record<FacetKey, number>;
}

const TYPES: ReadonlyArray<readonly [FacetKey, string]> = [
  ['all', 'All results'],
  ['officials', 'Officials'],
  ['bills', 'Bills'],
  ['committees', 'Committees'],
];

function buildHref(query: string, type: FacetKey): string {
  const sp = new URLSearchParams();
  if (query) sp.set('q', query);
  if (type !== 'all') sp.set('type', type);
  sp.set('v', 'new');
  return `/search?${sp.toString()}`;
}

export function FacetRail({ query, active, counts }: FacetRailProps) {
  return (
    <aside>
      <div style={{ border: '2px solid var(--ink)', background: 'var(--bg1)' }}>
        <div
          style={{
            background: 'var(--fg1)',
            color: 'var(--bg1)',
            padding: '10px 14px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Result type
        </div>
        {TYPES.map(([key, label], i) => {
          const isActive = key === active;
          const count = counts[key];
          return (
            <Link
              key={key}
              href={buildHref(query, key)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: isActive ? 'var(--bg2)' : 'var(--bg1)',
                borderTop: i === 0 ? 0 : '1px solid var(--line)',
                borderLeft: `3px solid ${isActive ? 'var(--civiq-blue)' : 'transparent'}`,
                fontFamily: 'var(--font-primary)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: 'var(--fg1)',
                textAlign: 'left',
                textDecoration: 'none',
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 14, border: '2px solid var(--ink)', padding: 14 }}>
        <CqLabel>Filters</CqLabel>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FacetGroup
            title="Chamber"
            options={[
              ['House', counts.officials],
              ['Senate', counts.officials],
              ['Joint', counts.committees],
            ]}
          />
          <FacetGroup
            title="Party"
            options={[
              ['Democrat', counts.officials],
              ['Republican', counts.officials],
              ['Independent', counts.officials],
            ]}
          />
        </div>
        <div
          style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid var(--line)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: '0.04em',
          }}
        >
          Filter wiring lands in PR 21.
        </div>
      </div>
    </aside>
  );
}

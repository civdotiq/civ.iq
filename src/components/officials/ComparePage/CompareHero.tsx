import { CqChip, CqLabel, CqPortrait } from '@/components/cq';
import type { CompareOfficial } from './types';

interface CompareHeroProps {
  official: CompareOfficial | null;
  side: 'left' | 'right';
  loading: boolean;
  bioguideId: string;
}

export function CompareHero({ official, side, loading, bioguideId }: CompareHeroProps) {
  const altShade = side === 'right';
  return (
    <div
      style={{
        padding: '20px 28px',
        borderRight: side === 'left' ? '1px solid var(--line)' : 0,
        background: altShade ? 'var(--bg2)' : 'var(--bg1)',
        minHeight: 200,
      }}
    >
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <CqPortrait
          name={official?.name ?? bioguideId}
          size={120}
          party={official?.party ?? 'i'}
          src={official?.imageUrl}
          alt={official ? `${official.name} portrait` : `${bioguideId} portrait`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {official ? (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <CqChip variant={official.party} size="sm">
                  {official.partyLabel} · {official.districtLabel}
                </CqChip>
                <CqChip variant="ink" filled={false} size="sm">
                  {official.chamber}
                </CqChip>
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  lineHeight: 1.0,
                  wordBreak: 'break-word',
                }}
              >
                {official.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {official.position}
                {official.since ? ` · Since ${official.since}` : ''}
              </div>
            </>
          ) : (
            <div>
              <CqLabel>{loading ? 'Loading official…' : 'Data unavailable'}</CqLabel>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginTop: 8,
                  color: loading ? 'var(--fg3)' : 'var(--fg2)',
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {bioguideId}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 8,
                }}
              >
                {loading
                  ? 'Fetching profile from Congress.gov…'
                  : 'No profile returned for this bioguide ID.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

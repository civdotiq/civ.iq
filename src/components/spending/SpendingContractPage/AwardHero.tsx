/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award hero — black file stamp.
 *
 * Left column: blue eyebrow with contract category + pricing,
 * gray sub-line with program / sub-tier office, UPPERCASE display
 * title with award description (truncated to ~80 chars). Right
 * column: stacked stats in a white-bordered box (obligated +
 * ceiling).
 */

import type { USASpendingAwardDetailResponse } from '@/types/spending';
import { contractTypeLabel, formatCompactDollars, formatDateLong, truncate } from './data';

interface AwardHeroProps {
  award: USASpendingAwardDetailResponse | null;
  loading: boolean;
  awardId: string;
}

export function AwardHero({ award, loading, awardId }: AwardHeroProps) {
  const obligated = award?.total_obligation ?? null;
  const ceiling = award?.base_and_all_options ?? award?.base_exercised_options ?? null;
  const periodEnd = award?.period_of_performance.end_date ?? null;
  const today = new Date();
  const status = !periodEnd
    ? '—'
    : new Date(periodEnd).getTime() < today.getTime()
      ? 'Closed'
      : 'Active';

  const typeLabel = award ? contractTypeLabel(award).category : 'Federal award';
  const subAgency =
    award?.awarding_agency?.subtier_agency?.name ??
    award?.awarding_agency?.toptier_agency?.name ??
    '';
  const office = award?.awarding_agency?.office_agency_name ?? '';
  const subLine = [subAgency, office].filter(Boolean).join(' · ');

  const titleSource = award?.description ?? (loading ? 'Loading award…' : 'Award');
  const title = truncate(titleSource, 80);

  const startDate = award?.period_of_performance.start_date ?? null;
  const endDate = award?.period_of_performance.end_date ?? null;
  const periodLine =
    startDate || endDate ? `${formatDateLong(startDate)} – ${formatDateLong(endDate)}` : '—';

  return (
    <div
      style={{
        background: 'var(--ink)',
        color: '#fff',
        padding: '32px 36px',
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: 32,
        marginBottom: 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--civiq-blue)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          {typeLabel}
        </div>
        <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>{subLine || '—'}</div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: '0 0 14px',
            textTransform: 'uppercase',
            color: '#fff',
          }}
        >
          {title || (loading ? 'Loading award…' : 'Award')}
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 24,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: '#d1d5db',
            flexWrap: 'wrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            Award ID ·{' '}
            <strong style={{ color: '#fff' }}>{award?.piid ?? award?.fain ?? awardId}</strong>
          </span>
          <span>
            Period · <strong style={{ color: '#fff' }}>{periodLine}</strong>
          </span>
          <span>
            Type · <strong style={{ color: '#fff' }}>{award?.type_description ?? '—'}</strong>
          </span>
        </div>
      </div>
      <div
        style={{
          border: '2px solid #fff',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#9ca3af',
            letterSpacing: '0.12em',
          }}
        >
          OBLIGATED
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginTop: 6,
            color: 'var(--civiq-blue)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {loading && obligated === null ? '—' : formatCompactDollars(obligated)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#9ca3af',
            marginTop: 6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          of {formatCompactDollars(ceiling)} ceiling
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#9ca3af',
            letterSpacing: '0.12em',
            marginTop: 14,
          }}
        >
          STATUS · {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

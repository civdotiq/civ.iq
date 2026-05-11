/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqDisclaimer, CqSourceTag } from '@/components/cq';
import { fetchTopicsForListing, TODAY_LABEL } from './data';
import { TopicResultRow } from './TopicResultRow';
import { VariantHeader } from './VariantHeader';
import { VariantPagination } from './VariantPagination';

export function TopicListingPage() {
  const start = Date.now();
  const rows = fetchTopicsForListing();
  const elapsed = Date.now() - start;

  return (
    <main
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        minHeight: '100vh',
        padding: '32px 36px 56px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 11,
              color: 'var(--civiq-blue)',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ← Home
          </Link>
          <CqSourceTag
            source="Curated topic map · Congress.gov subjects"
            time="Updated by hand"
            compact
          />
        </div>

        <VariantHeader
          label="Browse"
          title="Policy topics"
          count={rows.length}
          countNoun="topics"
          subChip="Curated set"
          hint="Each topic links to bills, committees, and reps active on the policy area"
        />

        {/*
         * No facet rail — twelve hand-curated topics is short enough to render as
         * a single list. The layout collapses to a single column when the
         * VariantSidebar is omitted (Correction 7).
         */}
        <div>
          {rows.map((t, i) => (
            <TopicResultRow key={t.slug} t={t} first={i === 0} />
          ))}

          <VariantPagination start={1} end={rows.length} total={rows.length} elapsedMs={elapsed} />

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer
              confidence={0.9}
              asof={TODAY_LABEL}
              method="Hand-curated topic set; per-topic bill counts on each detail page"
            >
              {' '}
              Bill and rep counts at the listing level would require twelve per-topic aggregation
              calls per page load. Open any topic for the full bill list, key sponsors, and
              sector-money split.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </main>
  );
}

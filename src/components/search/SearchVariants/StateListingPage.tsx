/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqDisclaimer, CqSourceTag } from '@/components/cq';
import { fetchStatesForListing, TODAY_LABEL } from './data';
import { StateResultRow } from './StateResultRow';
import { VariantHeader } from './VariantHeader';
import { VariantSidebar } from './VariantSidebar';
import { VariantFacetCard } from './VariantFacetCard';
import { VariantPagination } from './VariantPagination';
import { VariantEmptyState } from './VariantEmptyState';
import type { VariantFacetGroup, VariantSidebarItem } from './types';

const REGIONS: ReadonlyArray<'Northeast' | 'Midwest' | 'South' | 'West'> = [
  'Northeast',
  'Midwest',
  'South',
  'West',
];

interface StateListingPageProps {
  readonly region?: string;
}

function isValidRegion(value: string | undefined): value is (typeof REGIONS)[number] {
  return Boolean(value) && (REGIONS as ReadonlyArray<string>).includes(value as string);
}

export async function StateListingPage({ region }: StateListingPageProps) {
  const start = Date.now();
  const regionFilter = isValidRegion(region) ? region : null;
  const rows = await fetchStatesForListing(regionFilter);
  const elapsed = Date.now() - start;

  const allRows = regionFilter ? await fetchStatesForListing(null) : rows;
  const regionCounts = new Map<string, number>();
  for (const r of allRows) {
    regionCounts.set(r.region, (regionCounts.get(r.region) ?? 0) + 1);
  }

  const sidebarItems: ReadonlyArray<VariantSidebarItem> = [
    {
      key: 'all',
      label: 'All states',
      count: allRows.length,
      href: '/states?v=new',
      active: !regionFilter,
    },
    ...REGIONS.map(r => ({
      key: r,
      label: r,
      count: regionCounts.get(r) ?? 0,
      href: `/states?v=new&region=${encodeURIComponent(r)}`,
      active: regionFilter === r,
    })),
  ];

  const facetGroups: ReadonlyArray<VariantFacetGroup> = [];

  return (
    <main
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        minHeight: '100vh',
        padding: '32px 36px 56px',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
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
          <CqSourceTag source="Congress.gov 119th + Census region" time="Updated daily" compact />
        </div>

        <VariantHeader
          label="Browse"
          title="States and territories"
          count={allRows.length}
          countNoun="states"
          subChip={regionFilter ? `Region · ${regionFilter}` : '50 states'}
          hint="Federal House delegation drawn from the live Congress.gov roster"
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 32,
            alignItems: 'flex-start',
          }}
        >
          <div>
            <VariantSidebar heading="Filter by" items={sidebarItems} />
            <VariantFacetCard groups={facetGroups} />
          </div>

          <div>
            {rows.length === 0 ? (
              <VariantEmptyState
                headline="No states match"
                body={
                  <>
                    The 50-state set is fixed. If this list is empty the Congress.gov member roster
                    failed to load — usually a transient upstream error. Try again, or pick a
                    different region.
                  </>
                }
                resetHref="/states?v=new"
              />
            ) : (
              <>
                {rows.map((s, i) => (
                  <StateResultRow key={s.code} s={s} first={i === 0} />
                ))}
                <VariantPagination
                  start={1}
                  end={rows.length}
                  total={allRows.length}
                  elapsedMs={elapsed}
                />
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <CqDisclaimer
                confidence={0.97}
                asof={TODAY_LABEL}
                method="Live Congress.gov member roster aggregated by state"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

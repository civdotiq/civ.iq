/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqDisclaimer, CqSourceTag } from '@/components/cq';
import { fetchDistrictsForListing, TODAY_LABEL } from './data';
import { DistrictResultRow } from './DistrictResultRow';
import { VariantHeader } from './VariantHeader';
import { VariantSidebar } from './VariantSidebar';
import { VariantFacetCard } from './VariantFacetCard';
import { VariantPagination } from './VariantPagination';
import { VariantEmptyState } from './VariantEmptyState';
import type { VariantFacetGroup, VariantSidebarItem } from './types';

interface DistrictListingPageProps {
  readonly state?: string;
}

export async function DistrictListingPage({ state }: DistrictListingPageProps) {
  const start = Date.now();
  const stateFilter = state?.toUpperCase() ?? null;
  const rows = await fetchDistrictsForListing(stateFilter);
  const elapsed = Date.now() - start;

  // Build state facet from the unfiltered set so totals stay honest even
  // when a filter is active. We re-fetch unfiltered if a filter is on —
  // /api/districts/all is cached, so the second call is essentially free.
  const allRows = stateFilter ? await fetchDistrictsForListing(null) : rows;
  const stateCounts = new Map<string, number>();
  for (const r of allRows) {
    stateCounts.set(r.state, (stateCounts.get(r.state) ?? 0) + 1);
  }
  const stateOptions = Array.from(stateCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([code, count]) => ({
      label: code,
      count,
      href: `/districts?v=new&state=${code}`,
      active: code === stateFilter,
    }));

  const sidebarItems: ReadonlyArray<VariantSidebarItem> = [
    {
      key: 'all',
      label: 'All districts',
      count: allRows.length,
      href: '/districts?v=new',
      active: !stateFilter,
    },
  ];

  const facetGroups: ReadonlyArray<VariantFacetGroup> =
    stateOptions.length > 0 ? [{ title: 'State (top 12)', options: stateOptions }] : [];

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
          <CqSourceTag source="Census ACS 2020 + Congress.gov 119th" time="Updated daily" compact />
        </div>

        <VariantHeader
          label="Browse"
          title="Federal House districts"
          count={allRows.length}
          countNoun="districts"
          subChip="119th Congress"
          hint="Census 2020 reapportionment · Live Congress.gov roster"
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
                headline="No districts to show"
                body={
                  <>
                    We have boundaries for 435 House districts plus DC, AS, GU, MP, PR, VI delegate
                    seats. If a district is missing here, the Census Bureau has not yet published a
                    current ACS rollup for that geography. Check back after the next quarterly
                    Census release.
                  </>
                }
                resetHref="/districts?v=new"
              />
            ) : (
              <>
                {rows.map((d, i) => (
                  <DistrictResultRow key={d.id} d={d} first={i === 0} />
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
                confidence={0.95}
                asof={TODAY_LABEL}
                method="Census ACS 5-year + Congress.gov member roster"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

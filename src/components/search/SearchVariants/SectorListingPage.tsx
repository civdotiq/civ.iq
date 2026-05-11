/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqDisclaimer, CqSourceTag } from '@/components/cq';
import { fetchSectorsForListing, TODAY_LABEL } from './data';
import { SectorResultRow } from './SectorResultRow';
import { VariantHeader } from './VariantHeader';
import { VariantSidebar } from './VariantSidebar';
import { VariantFacetCard } from './VariantFacetCard';
import { VariantPagination } from './VariantPagination';
import type { VariantFacetGroup, VariantSidebarItem } from './types';

const CYCLES: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { key: '2024', label: '2023–24 cycle' },
  { key: '2022', label: '2021–22 cycle' },
];

interface SectorListingPageProps {
  readonly cycle?: string;
}

export function SectorListingPage({ cycle }: SectorListingPageProps) {
  const start = Date.now();
  const rows = fetchSectorsForListing();
  const elapsed = Date.now() - start;

  const sidebarItems: ReadonlyArray<VariantSidebarItem> = [
    {
      key: 'all',
      label: 'All sectors',
      count: rows.length,
      href: '/industry?v=new',
      active: !cycle,
    },
  ];

  const facetGroups: ReadonlyArray<VariantFacetGroup> = [
    {
      title: 'Election cycle',
      options: CYCLES.map(c => ({
        label: c.label,
        count: null,
        href: `/industry?v=new&cycle=${c.key}`,
        active: cycle === c.key,
      })),
    },
  ];

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
          <CqSourceTag
            source="FEC.gov / OpenSecrets categorization"
            time="Per-sector rollups on detail pages"
            compact
          />
        </div>

        <VariantHeader
          label="Browse"
          title="Industry sectors"
          count={rows.length}
          countNoun="sectors"
          subChip={cycle ? `Cycle · ${cycle}` : 'All cycles'}
          hint="Open each sector for cycle totals, top recipients, and lobbying detail"
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
            {rows.map((s, i) => (
              <SectorResultRow key={s.slug} s={s} first={i === 0} />
            ))}
            <VariantPagination
              start={1}
              end={rows.length}
              total={rows.length}
              elapsedMs={elapsed}
            />

            <div style={{ marginTop: 16 }}>
              <CqDisclaimer
                confidence={0.92}
                asof={TODAY_LABEL}
                method="Sector taxonomy from OpenSecrets / FEC; cycle totals on detail pages"
              >
                {' '}
                Per-sector cycle totals and top-recipient rollups live on each sector&rsquo;s detail
                page — running them at listing scale would require thirteen leaderboard queries per
                page load. Click into any sector for the full picture.
              </CqDisclaimer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

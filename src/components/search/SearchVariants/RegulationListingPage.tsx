/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqDisclaimer, CqSourceTag } from '@/components/cq';
import { fetchRegulationsForListing, TODAY_LABEL } from './data';
import { RegulationResultRow } from './RegulationResultRow';
import { VariantHeader } from './VariantHeader';
import { VariantSidebar } from './VariantSidebar';
import { VariantFacetCard } from './VariantFacetCard';
import { VariantPagination } from './VariantPagination';
import { VariantEmptyState } from './VariantEmptyState';
import type { VariantFacetGroup, VariantSidebarItem } from './types';

type CommentStatus = 'all' | 'open' | 'closed';

interface RegulationListingPageProps {
  readonly agency?: string;
  readonly status?: string;
}

function normalizeStatus(value: string | undefined): CommentStatus {
  if (value === 'open' || value === 'closed') return value;
  return 'all';
}

export async function RegulationListingPage({ agency, status }: RegulationListingPageProps) {
  const start = Date.now();
  const commentStatus = normalizeStatus(status);
  const agencyFilter = agency ?? null;
  const result = await fetchRegulationsForListing(agencyFilter, commentStatus);
  const elapsed = Date.now() - start;

  const sidebarItems: ReadonlyArray<VariantSidebarItem> = [
    {
      key: 'all',
      label: 'All comment status',
      count: null,
      href: '/regulations?v=new',
      active: commentStatus === 'all' && !agencyFilter,
    },
    {
      key: 'open',
      label: 'Open for comment',
      count: null,
      href: `/regulations?v=new&status=open${agencyFilter ? `&agency=${encodeURIComponent(agencyFilter)}` : ''}`,
      active: commentStatus === 'open',
    },
    {
      key: 'closed',
      label: 'Comment closed',
      count: null,
      href: `/regulations?v=new&status=closed${agencyFilter ? `&agency=${encodeURIComponent(agencyFilter)}` : ''}`,
      active: commentStatus === 'closed',
    },
  ];

  const facetGroups: ReadonlyArray<VariantFacetGroup> =
    result.agencies.length > 0
      ? [
          {
            title: 'Agency (top 8 in window)',
            options: result.agencies.map(a => ({
              label: a.name,
              count: a.count,
              href: `/regulations?v=new&agency=${encodeURIComponent(a.name)}${commentStatus !== 'all' ? `&status=${commentStatus}` : ''}`,
              active: agencyFilter === a.name,
            })),
          },
        ]
      : [];

  const subChip =
    commentStatus === 'open'
      ? 'Open comment periods'
      : commentStatus === 'closed'
        ? 'Closed comment periods'
        : 'Latest 50 entries';

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
          <CqSourceTag source="Federal Register API v1" time="Updated hourly" compact />
        </div>

        <VariantHeader
          label="Browse"
          title="Federal Register"
          count={result.rows.length}
          countNoun="entries"
          subChip={subChip}
          hint="Comment status derived from each entry's comment-period close date"
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
            <VariantSidebar heading="Comment status" items={sidebarItems} />
            <VariantFacetCard groups={facetGroups} />
          </div>

          <div>
            {result.rows.length === 0 ? (
              <VariantEmptyState
                headline={
                  agencyFilter ? `No entries from ${agencyFilter}` : 'No entries match this filter'
                }
                body={
                  <>
                    The Federal Register publishes proposed rules, final rules, notices, and
                    presidential documents. The latest 50 entries are pulled from the API every
                    hour. Try resetting filters or check back later.
                  </>
                }
                resetHref="/regulations?v=new"
              />
            ) : (
              <>
                {result.rows.map((r, i) => (
                  <RegulationResultRow key={r.id} r={r} first={i === 0} />
                ))}
                <VariantPagination
                  start={1}
                  end={result.rows.length}
                  total={result.total}
                  elapsedMs={elapsed}
                />
              </>
            )}

            <div style={{ marginTop: 16 }}>
              <CqDisclaimer
                confidence={0.96}
                asof={TODAY_LABEL}
                method="Federal Register API v1 — direct ingestion, no inference"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

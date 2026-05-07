/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { CompactHero } from './CompactHero';
import { FilterRail } from './FilterRail';
import { VotesTable } from './VotesTable';
import { SummaryStats } from './SummaryStats';
import { applyFilters, uniqueCategories, uniqueYears } from './data';
import { INITIAL_FILTERS } from './types';
import type { FilterState, VotesResponse, VotingRecordPageProps } from './types';

const VOTES_LIMIT = 50;

const fetcher = async (url: string): Promise<VotesResponse | null> => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as VotesResponse;
};

export function VotingRecordPage({ representative: r }: VotingRecordPageProps) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const { data, isLoading, error } = useSWR<VotesResponse | null>(
    `/api/representative/${r.bioguideId}/votes?limit=${VOTES_LIMIT}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const votes = useMemo(() => data?.votes ?? [], [data]);
  const totalLoaded = votes.length;
  const totalReported = data?.totalResults;

  const filteredVotes = useMemo(() => applyFilters(votes, filters), [votes, filters]);
  const availableYears = useMemo(() => uniqueYears(votes), [votes]);
  const availableCategories = useMemo(() => uniqueCategories(votes), [votes]);

  const dataAsOf = data?.metadata?.timestamp
    ? new Date(data.metadata.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  const fetchFailed = !isLoading && (error || data?.success === false);

  const districtPath = r.district ? `/district/${r.state}/${r.district}` : `/states/${r.state}`;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Officials', url: 'https://civdotiq.org/representative' },
          { name: r.name, url: `https://civdotiq.org/representative/${r.bioguideId}` },
          {
            name: 'Voting record',
            url: `https://civdotiq.org/representative/${r.bioguideId}/votes`,
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <CqLabel>
          ← Federal · {r.chamber} · {r.state}
          {r.district ? ` · District ${r.district}` : ''} · Voting record
        </CqLabel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <CqSourceTag compact source="Congress.gov" id="roll-call" />
          <CqSourceTag
            compact
            source={r.chamber === 'Senate' ? 'Senate.gov XML' : 'House Clerk XML'}
            id="member feed"
          />
        </div>
      </div>

      <CompactHero
        representative={r}
        totalVotes={typeof totalReported === 'number' ? totalReported : undefined}
        loading={isLoading}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr)',
          gap: 28,
          alignItems: 'flex-start',
          marginTop: 24,
        }}
      >
        <FilterRail
          filters={filters}
          onChange={setFilters}
          availableCategories={availableCategories}
          availableYears={availableYears}
          loaded={totalLoaded}
          matched={filteredVotes.length}
        />

        <section style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <CqLabel>Recent floor votes · {filteredVotes.length} shown</CqLabel>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-display)',
                  marginTop: 4,
                }}
              >
                Floor votes by roll call
              </div>
            </div>
            <a
              href={`https://www.congress.gov/member/${r.bioguideId}/votes`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: 'var(--civiq-blue-active)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontFamily: 'var(--font-mono)',
              }}
            >
              View all on Congress.gov →
            </a>
          </div>

          {fetchFailed ? (
            <div
              style={{
                border: '2px solid var(--ink)',
                padding: '20px 18px',
                background: 'var(--bg2)',
                fontSize: 13,
                color: 'var(--fg2)',
                lineHeight: 1.55,
              }}
            >
              Data unavailable — last successful fetch {dataAsOf}. Roll-call votes load directly
              from Congress.gov; the upstream feed may be temporarily unreachable.
            </div>
          ) : (
            <VotesTable votes={filteredVotes} loading={isLoading} totalLoaded={totalLoaded} />
          )}
        </section>
      </div>

      <SummaryStats votes={filteredVotes} />

      {filteredVotes.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <CqPlainReading>
            {r.lastName || r.name} cast {filteredVotes.length.toLocaleString('en-US')} of the{' '}
            {totalLoaded.toLocaleString('en-US')} most recent roll-call votes returned by
            Congress.gov for this member. Filter facets narrow the loaded set; full history is on{' '}
            <a
              href={`https://www.congress.gov/member/${r.bioguideId}/votes`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--civiq-blue-active)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Congress.gov
            </a>
            .
          </CqPlainReading>
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.99}
          asof={dataAsOf}
          method={
            r.chamber === 'Senate'
              ? 'Senate.gov XML feed · ingested daily'
              : 'House Clerk roll-call XML · enriched via Congress.gov · ingested daily'
          }
        >
          {' '}
          A Yea / Nay record reflects how a vote was cast, not the substance of the bill. See the
          bill page for plain-language summaries and full text.
          {' · '}
          <a
            href={districtPath}
            style={{
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            District context
          </a>
        </CqDisclaimer>
      </div>
    </div>
  );
}

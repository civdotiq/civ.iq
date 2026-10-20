/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Source lists for each page's "Sources and method" block.
 *
 * Every source the page draws on is listed. Dates appear only where the
 * record carries one: `asOf` is the upstream's own date, `fetchedAt` is when
 * CIV.IQ fetched it. Render time is never passed off as either.
 */

import type { DataSource } from '@/shared/components/ui/DataProvenance';
import type { Bill } from '@/types/bill';
import type { UnifiedVoteDetail } from '@/lib/services/vote.service';
import { formatDateOnly } from '@/lib/utils/date-only';
import { officialVoteRecordUrl } from '@/lib/votes/vote-links';
import { registrySource } from './source-registry';

const DATE = { month: 'short', day: 'numeric', year: 'numeric' } as const;
const fmt = (value: string) => formatDateOnly(value, DATE);

/** Latest of a list of date strings, or undefined if none parse. */
function latest(dates: Array<string | undefined>): string | undefined {
  return dates
    .filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function billPageSources(bill: Bill): DataSource[] {
  // lookupBill fetches all of these in one cached call, so they share one
  // load time.
  const fetchedAt = bill.lastUpdated;
  const sources: DataSource[] = [];

  const congressAsOf = bill.sourceUpdatedAt
    ? `Record updated ${fmt(bill.sourceUpdatedAt)}`
    : bill.status.lastAction.date
      ? `Latest action ${fmt(bill.status.lastAction.date)}`
      : undefined;
  sources.push(
    registrySource('congressGov', {
      covers: 'Status, actions, sponsors, cosponsors, committees and text',
      asOf: congressAsOf,
      fetchedAt,
      href: bill.url,
    })
  );

  if (bill.summary) {
    sources.push(
      registrySource('crs', {
        covers: 'Official summary',
        asOf: `Summary of the “${bill.summary.version}” version, ${fmt(bill.summary.date)}`,
        fetchedAt,
        href: bill.url,
      })
    );
  }

  for (const chamber of ['House', 'Senate'] as const) {
    const votes = bill.votes.filter(v => v.chamber === chamber);
    if (votes.length === 0) continue;
    const newest = latest(votes.map(v => v.date));
    sources.push(
      registrySource(chamber === 'House' ? 'houseClerk' : 'senate', {
        covers: 'Roll-call results on this bill',
        asOf: newest ? `Latest roll call ${fmt(newest)}` : undefined,
        fetchedAt,
      })
    );
  }

  const estimates = bill.cboCostEstimates ?? [];
  if (estimates.length > 0) {
    const newest = latest(estimates.map(e => e.pubDate));
    const newestUrl = estimates.find(e => e.pubDate === newest)?.url;
    sources.push(
      registrySource('cbo', {
        covers: 'Cost estimates',
        asOf: newest ? `Latest estimate ${fmt(newest)}` : undefined,
        fetchedAt,
        href: newestUrl?.startsWith('https://www.cbo.gov/') ? newestUrl : undefined,
      })
    );
  }

  // Loaded in the browser by their own sections; no date reaches this block.
  sources.push(registrySource('usaspending', { covers: 'Related Federal Spending section' }));
  sources.push(registrySource('fec', { covers: 'Funding & Lobbying section' }));
  sources.push(registrySource('lda', { covers: 'Funding & Lobbying section' }));

  return sources;
}

export function votePageSources(vote: UnifiedVoteDetail): DataSource[] {
  const { metadata } = vote;
  const heldOn = vote.date ? `Vote held ${fmt(vote.date)}` : undefined;
  const officialRecord = officialVoteRecordUrl(metadata.xmlUrl) ?? undefined;
  // enrichBillData adds the summary only when Congress.gov answered; without
  // it the bill title came from the vote record itself.
  const hasBillSummary = !!vote.bill?.summary;
  const billHref = vote.bill?.url?.startsWith('https://www.congress.gov/')
    ? vote.bill.url
    : undefined;
  const sources: DataSource[] = [];

  if (vote.chamber === 'House') {
    sources.push(
      registrySource('congressGov', {
        covers: hasBillSummary
          ? 'Question, result, vote totals and bill summary'
          : 'Question, result and vote totals',
        asOf: heldOn,
        fetchedAt: metadata.processingDate,
      })
    );
    if (vote.members.length > 0) {
      sources.push(
        registrySource('houseClerk', {
          covers: 'How each member voted',
          fetchedAt: metadata.processingDate,
          href: officialRecord,
        })
      );
    }
  } else if (metadata.source === 'senate-corpus-mirror') {
    // Served from our daily mirror of senate.gov, not fetched on this
    // request: show when the mirror last synced, not a load time.
    const synced = metadata.mirrorSyncedAt
      ? `Mirror last synced ${fmt(metadata.mirrorSyncedAt)}`
      : undefined;
    sources.push(
      registrySource('senate', {
        covers: 'Question, result, totals and how each senator voted',
        asOf: [heldOn, synced].filter(Boolean).join(' · ') || undefined,
        href: officialRecord,
      })
    );
  } else {
    sources.push(
      registrySource('senate', {
        covers: 'Question, result, totals and how each senator voted',
        asOf: heldOn,
        fetchedAt: metadata.processingDate,
        href: officialRecord,
      })
    );
  }

  if (vote.chamber === 'Senate' && hasBillSummary) {
    sources.push(
      registrySource('congressGov', {
        covers: 'Bill summary',
        fetchedAt: metadata.processingDate,
        href: billHref,
      })
    );
  }

  sources.push(
    registrySource('congressLegislators', { covers: 'Member names, parties and states' })
  );

  return sources;
}

/** What the profile's own data responses carry; mapped by ProfileRedesign. */
export interface ProfileSourceInput {
  chamber: string;
  /** Dates of the roll calls the Recent votes section shows. */
  voteDates?: string[];
  /** Introduced dates of the bills the Bills section shows. */
  billIntroducedDates?: string[];
  finance?: { lastUpdated?: string; coverageEndDate?: string } | null;
}

/**
 * The profile loads its sections in the browser from cached endpoints, so
 * there is no single fetch time for bills or votes. Their rows carry only
 * the newest date in what the page shows; FEC totals carry their own fetch
 * time and report period.
 */
export function profilePageSources(input: ProfileSourceInput): DataSource[] {
  const newestVote = latest(input.voteDates ?? []);
  const newestBill = latest(input.billIntroducedDates ?? []);
  const voteAsOf = newestVote ? `Latest roll call ${fmt(newestVote)}` : undefined;
  const billAsOf = newestBill ? `Newest bill introduced ${fmt(newestBill)}` : undefined;
  const sources: DataSource[] = [
    registrySource('congressLegislators', {
      covers: 'Name, party, terms, committees and contact details',
    }),
  ];

  if (input.chamber === 'Senate') {
    sources.push(registrySource('senate', { covers: 'Recent roll-call votes', asOf: voteAsOf }));
    sources.push(
      registrySource('congressGov', { covers: 'Sponsored and cosponsored bills', asOf: billAsOf })
    );
  } else {
    // House roll calls and bills both come from Congress.gov: one row.
    sources.push(
      registrySource('congressGov', {
        covers: 'Recent roll-call votes, sponsored and cosponsored bills',
        asOf: [voteAsOf, billAsOf].filter(Boolean).join(' · ') || undefined,
      })
    );
  }

  const coverageEnd = input.finance?.coverageEndDate;
  sources.push(
    registrySource('fec', {
      covers: 'Money raised and spent, and candidate filings',
      asOf: coverageEnd ? `Filings through ${fmt(coverageEnd)}` : undefined,
      fetchedAt: input.finance?.lastUpdated,
    })
  );
  sources.push(registrySource('lda', { covers: 'Influence section' }));
  sources.push(registrySource('news', { covers: 'News section' }));

  return sources;
}

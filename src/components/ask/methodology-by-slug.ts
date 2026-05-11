/**
 * methodology-by-slug — hard-coded "How this answer was built" metadata for
 * the 9 active question slugs.
 *
 * v1 carve-out: the typed answer pods (CampaignContributionsAnswer, etc.) do
 * not self-describe their sources / retrieval scope / refresh cadence. That
 * is a separate, ARCHITECTURE-level addition (each pod would need to publish
 * a manifest). Until that lands, we hard-code one entry per active slug.
 *
 * When a new question template ships, add one entry here. If a pod's data
 * provider changes, update the matching entry — same coupling we already
 * have on the descriptionPattern in question-registry.ts.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { CqMethodologySource } from '@/components/cq';

export interface SlugMethodology {
  sources: ReadonlyArray<CqMethodologySource>;
  retrieval: string;
  generation: string;
  refresh: string;
  limitations: ReadonlyArray<string>;
  /** Citation-rail entries naming the upstream sources the pod consulted. */
  citations: ReadonlyArray<{ source: string; entity: string; href?: string }>;
  /**
   * "Open the underlying data" tiles. `route` is a route pattern with
   * `{entityId}` substitution; only enumerated where the canonical page
   * exists today.
   */
  underlyingData: ReadonlyArray<{ route: string; title: string; sub: string }>;
}

const EXTRACTIVE_GENERATION = 'Extractive only · no LLM synthesis.';

const REP_CITATIONS_FEC = [
  {
    source: 'FEC.gov',
    entity: 'Candidate summary · current cycle',
    href: 'https://www.fec.gov/',
  },
  { source: 'FEC.gov', entity: 'Itemized contributions · Schedule A' },
];

const REP_CITATIONS_VOTES = [
  { source: 'House Clerk', entity: 'Roll-call vote XML feeds' },
  { source: 'Senate.gov', entity: 'Roll-call vote XML feeds' },
  {
    source: 'Congress.gov',
    entity: 'Member voting records · API v3',
    href: 'https://api.congress.gov/',
  },
];

const REP_CITATIONS_BILLS = [
  {
    source: 'Congress.gov',
    entity: 'Sponsored + cosponsored bill index · API v3',
    href: 'https://api.congress.gov/',
  },
];

const REP_CITATIONS_DIRECTORY = [
  {
    source: 'congress-legislators',
    entity: 'Current-member directory',
    href: 'https://github.com/unitedstates/congress-legislators',
  },
  {
    source: 'House.gov / Senate.gov',
    entity: 'Official member contact pages',
  },
];

const COMMITTEE_CITATIONS_BASE = [
  {
    source: 'Congress.gov',
    entity: 'Committee directory · API v3',
    href: 'https://api.congress.gov/',
  },
];

export const METHODOLOGY_BY_SLUG: Record<string, SlugMethodology> = {
  'campaign-contributions': {
    sources: [
      { name: 'FEC.gov', note: 'Candidate cycle totals, source breakdown, itemized donor records' },
      { name: 'OpenSecrets (CRP)', note: 'Industry / sector classification on itemized donors' },
    ],
    retrieval:
      'Entity-scoped query: bioguide ID resolved to FEC candidate ID; current cycle pulled with prior cycles as fallback.',
    generation: EXTRACTIVE_GENERATION,
    refresh:
      'FEC summaries refresh quarterly with each filing deadline. Itemized records refresh continuously during reporting periods.',
    limitations: [
      'Bulk industry classification only. CIV.IQ does not infer motive from donor patterns.',
      'Independent expenditures and dark-money spending are not in the candidate totals.',
      'State and local campaign finance are not included — federal cycles only.',
      'Donors who left employer blank or wrote SELF-EMPLOYED are bucketed as unattributed, not as a sector.',
    ],
    citations: REP_CITATIONS_FEC,
    underlyingData: [
      { route: '/representative/{entityId}', title: 'Full profile', sub: 'All panels' },
      { route: '/representative/{entityId}/votes', title: 'Voting record', sub: 'Roll-call list' },
    ],
  },
  'voting-record': {
    sources: [
      { name: 'House Clerk', note: 'House roll-call vote XML feeds' },
      { name: 'Senate.gov', note: 'Senate roll-call vote XML feeds' },
      { name: 'Congress.gov', note: 'Member-level vote and sponsored bill index' },
    ],
    retrieval:
      'Entity-scoped query: bioguide ID resolved to chamber; recent roll-call votes pulled in cycle batches.',
    generation: EXTRACTIVE_GENERATION,
    refresh: 'House Clerk and Senate feeds refresh nightly after each session day.',
    limitations: [
      'Recorded floor votes only. Committee deliberations and voice votes are not tracked.',
      'Vote outcomes are recorded, not interpreted. CIV.IQ does not assign motive.',
      'Cosponsorship and procedural votes are surfaced separately from substantive final-passage votes.',
    ],
    citations: REP_CITATIONS_VOTES,
    underlyingData: [
      { route: '/representative/{entityId}/votes', title: 'Voting record', sub: 'Full roll-calls' },
      { route: '/representative/{entityId}', title: 'Full profile', sub: 'All panels' },
    ],
  },
  'bills-sponsored': {
    sources: [
      {
        name: 'Congress.gov',
        note: 'Sponsored and cosponsored bill index for the 119th Congress',
      },
    ],
    retrieval:
      'Entity-scoped query: bioguide ID matched against the Congress.gov member-bill index for the current Congress.',
    generation: EXTRACTIVE_GENERATION,
    refresh: 'Congress.gov bill index refreshes daily.',
    limitations: [
      'Only the current Congress is surfaced by default. Historical sponsorship lives on the full profile.',
      'Cosponsorship signals interest, not authorship. The bill text may be drafted elsewhere.',
      'Policy-area tagging comes from Congress.gov; some adjacent bills may be filed under tax, banking, or appropriations rather than the subject heading shown.',
    ],
    citations: REP_CITATIONS_BILLS,
    underlyingData: [
      { route: '/representative/{entityId}', title: 'Full profile', sub: 'Bills panel' },
      { route: '/representative/{entityId}/votes', title: 'Voting record', sub: 'Roll-call list' },
    ],
  },
  'contact-info': {
    sources: [
      { name: 'congress-legislators', note: 'Current-member directory (office, phone, address)' },
      { name: 'House.gov / Senate.gov', note: 'Official member contact pages' },
    ],
    retrieval:
      'Entity-scoped lookup: bioguide ID matched against the canonical congress-legislators YAML.',
    generation: EXTRACTIVE_GENERATION,
    refresh:
      'Directory refreshes when members are sworn in or relocate offices; typical lag is days.',
    limitations: [
      'Email addresses are usually replaced by official contact forms — that is how members prefer to receive constituent mail.',
      'Personal social media is not curated; only accounts an official has publicly tied to their office are listed.',
      'District-office contact differs from DC-office contact; use whichever fits your purpose.',
    ],
    citations: REP_CITATIONS_DIRECTORY,
    underlyingData: [
      { route: '/representative/{entityId}', title: 'Full profile', sub: 'Contact panel' },
    ],
  },
  'donor-voting-alignment': {
    sources: [
      { name: 'FEC.gov', note: 'Itemized contributions, industry classification' },
      { name: 'House Clerk', note: 'House roll-call vote feeds' },
      { name: 'Senate.gov', note: 'Senate roll-call vote feeds' },
      { name: 'Congress.gov', note: 'Bill metadata, subject tagging' },
    ],
    retrieval:
      'Statistical analyzer joins top contributing sectors against roll-call votes on bills touching those sectors. Minimum 10 votes per sector required.',
    generation:
      'Statistical correlation only · no causation claimed · CIV.IQ does not infer motive.',
    refresh:
      'Analyzer recomputes on a 24-hour TTL; underlying votes refresh nightly, FEC industry totals lag filings by 7–14 days.',
    limitations: [
      'Correlation does not imply causation. Many factors shape a vote.',
      'Sectors with fewer than 10 substantive votes are excluded — sample size is too small to band.',
      'The analyzer takes 40–55 seconds on a cold cache for newly-visited members; the page shell renders immediately while the pod streams in.',
      'Sector classification is bulk; individual donors can be misattributed.',
    ],
    citations: [...REP_CITATIONS_FEC, ...REP_CITATIONS_VOTES],
    underlyingData: [
      { route: '/representative/{entityId}', title: 'Full profile', sub: 'Money + Record' },
      { route: '/representative/{entityId}/votes', title: 'Voting record', sub: 'Roll-call list' },
    ],
  },
  'committee-members': {
    sources: [
      { name: 'Congress.gov', note: 'Committee directory, members, leadership, subcommittees' },
    ],
    retrieval: 'Entity-scoped query: committee ID matched against Congress.gov API v3.',
    generation: EXTRACTIVE_GENERATION,
    refresh: 'Committee rosters refresh when members are reassigned; typical lag is days.',
    limitations: [
      'Subcommittee membership is enumerated where Congress.gov publishes it; some assignments are surfaced only after the full committee reorganizes.',
      'Ranking-member and chair changes mid-Congress can lag the directory by a session.',
    ],
    citations: COMMITTEE_CITATIONS_BASE,
    underlyingData: [
      { route: '/committee/{entityId}', title: 'Committee detail', sub: 'Members + work' },
    ],
  },
  'committee-activity': {
    sources: [
      { name: 'Congress.gov', note: 'Committee hearings, meetings, and bills in committee' },
    ],
    retrieval:
      'Entity-scoped query: committee ID matched against the Congress.gov meeting and bill indices.',
    generation: EXTRACTIVE_GENERATION,
    refresh: 'Meeting and bill listings refresh daily.',
    limitations: [
      'Only formally scheduled hearings appear. Closed-door deliberations are not in the dataset.',
      'Bills "in committee" are the current snapshot — a bill that moved to the floor is no longer surfaced here.',
    ],
    citations: COMMITTEE_CITATIONS_BASE,
    underlyingData: [
      { route: '/committee/{entityId}', title: 'Committee detail', sub: 'Members + work' },
    ],
  },
  'committee-lobbying': {
    sources: [{ name: 'Senate LDA', note: 'Lobbying registrations and quarterly LD-2 filings' }],
    retrieval:
      'Pipeline analyzer scans LD-2 filings for committee references and aggregates organization-level spending.',
    generation:
      'Statistical aggregation · no LLM synthesis · CIV.IQ does not infer influence direction.',
    refresh: 'Senate LDA filings are quarterly. Aggregates refresh within 1–2 days of filing.',
    limitations: [
      'Lobbying disclosure captures registered activity only. Informal influence is not in the dataset.',
      'Filings list issues, not outcomes. A lobbying mention is not evidence that the committee changed direction.',
      'Spending totals reflect the lobbying firm’s entire quarterly disclosure, not just work on this committee.',
    ],
    citations: [
      { source: 'Senate LDA', entity: 'LD-2 quarterly filings', href: 'https://lda.senate.gov/' },
    ],
    underlyingData: [
      { route: '/committee/{entityId}', title: 'Committee detail', sub: 'Lobbying panel' },
    ],
  },
  'topic-bills': {
    sources: [
      { name: 'Congress.gov', note: 'Bill index, subject tagging' },
      { name: 'Federal Register', note: 'Rules, notices, and executive actions' },
      { name: 'USAspending.gov', note: 'Federal awards tagged to program areas' },
    ],
    retrieval:
      'Topic-scoped query: policy-area slug matched against Congress.gov subject headings and Federal Register topic tags.',
    generation: EXTRACTIVE_GENERATION,
    refresh: 'Congress.gov daily; Federal Register daily; USAspending updates weekly.',
    limitations: [
      'Subject tagging is editorial — adjacent topics filed under tax, banking, or appropriations may not surface.',
      'Topic pages aggregate, they do not curate. A relevant bill missing a subject tag will not appear.',
      'Federal Register rules are notices, not enacted policy; comment periods are surfaced separately.',
    ],
    citations: [
      { source: 'Congress.gov', entity: 'Bill subject index', href: 'https://api.congress.gov/' },
      {
        source: 'Federal Register',
        entity: 'Rules and notices by topic',
        href: 'https://www.federalregister.gov/',
      },
    ],
    underlyingData: [
      { route: '/topics/{entityId}', title: 'Topic detail', sub: 'Bills + rules + spending' },
    ],
  },
};

export function getMethodologyForSlug(slug: string): SlugMethodology | undefined {
  return METHODOLOGY_BY_SLUG[slug];
}

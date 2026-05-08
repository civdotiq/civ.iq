/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the IssueTopic redesigned page (PR 16). Slug map,
 * formatters, and party-bucket helpers. No data fetching here — SWR
 * lives in the client component.
 */

import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { LeaderboardEntry } from './types';

/**
 * Slug → Congress.gov policyArea string.
 *
 * Each entry maps a URL slug to one of the canonical policyArea values
 * recognised by getPolicyAreaMapping(). Both kebab-case forms of the
 * policy-area name and short user-friendly aliases (e.g. "housing") are
 * accepted. Slugs already served by hand-built static SEO pages
 * (agriculture, defense, economy, education, environment, finance,
 * foreign-policy, healthcare, immigration, infrastructure, justice,
 * technology) will route to those static pages first — Next.js prefers
 * static segments over dynamic. The mapping below is the union: if PR 16
 * needs to render one of those slugs in the future, the static folder is
 * removed and the dynamic route picks up.
 */
const SLUG_TO_POLICY_AREA: Record<string, string> = {
  // canonical kebab forms
  'agriculture-and-food': 'Agriculture and Food',
  animals: 'Animals',
  'armed-forces-and-national-security': 'Armed Forces and National Security',
  'arts-culture-religion': 'Arts, Culture, Religion',
  'civil-rights-and-liberties': 'Civil Rights and Liberties, Minority Issues',
  commerce: 'Commerce',
  congress: 'Congress',
  'crime-and-law-enforcement': 'Crime and Law Enforcement',
  'economics-and-public-finance': 'Economics and Public Finance',
  'emergency-management': 'Emergency Management',
  energy: 'Energy',
  'environmental-protection': 'Environmental Protection',
  families: 'Families',
  'finance-and-financial-sector': 'Finance and Financial Sector',
  'foreign-trade-and-international-finance': 'Foreign Trade and International Finance',
  'government-operations-and-politics': 'Government Operations and Politics',
  health: 'Health',
  'housing-and-community-development': 'Housing and Community Development',
  'international-affairs': 'International Affairs',
  'labor-and-employment': 'Labor and Employment',
  law: 'Law',
  'native-americans': 'Native Americans',
  'public-lands-and-natural-resources': 'Public Lands and Natural Resources',
  'science-technology-communications': 'Science, Technology, Communications',
  'social-sciences-and-history': 'Social Sciences and History',
  'social-welfare': 'Social Welfare',
  'sports-and-recreation': 'Sports and Recreation',
  taxation: 'Taxation',
  'transportation-and-public-works': 'Transportation and Public Works',
  'water-resources-development': 'Water Resources Development',
  // short user-friendly aliases (default redesign test target is /topics/housing)
  agriculture: 'Agriculture and Food',
  defense: 'Armed Forces and National Security',
  economy: 'Economics and Public Finance',
  education: 'Education',
  environment: 'Environmental Protection',
  finance: 'Finance and Financial Sector',
  'foreign-policy': 'International Affairs',
  healthcare: 'Health',
  housing: 'Housing and Community Development',
  immigration: 'Immigration',
  infrastructure: 'Transportation and Public Works',
  justice: 'Crime and Law Enforcement',
  technology: 'Science, Technology, Communications',
  // direct policy-area kebab also supported as itself
  Education: 'Education',
  Immigration: 'Immigration',
};

/** Resolve a topic slug → canonical Congress.gov policyArea, or null. */
export function resolveSlugToPolicyArea(slug: string): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  return SLUG_TO_POLICY_AREA[normalized] ?? null;
}

/** Display name for the hero banner — short user-facing form. */
export function policyAreaDisplayName(policyArea: string): string {
  return policyArea;
}

const SECTOR_TO_LEADERBOARD_SLUG: Record<IndustrySector, string> = {
  [IndustrySector.AGRIBUSINESS]: 'agribusiness',
  [IndustrySector.COMMUNICATIONS_ELECTRONICS]: 'communications-electronics',
  [IndustrySector.CONSTRUCTION]: 'construction',
  [IndustrySector.DEFENSE]: 'defense',
  [IndustrySector.ENERGY_NATURAL_RESOURCES]: 'energy-natural-resources',
  [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE]: 'finance-insurance-real-estate',
  [IndustrySector.HEALTH]: 'health',
  [IndustrySector.LAWYERS_LOBBYISTS]: 'lawyers-lobbyists',
  [IndustrySector.TRANSPORTATION]: 'transportation',
  [IndustrySector.MISC_BUSINESS]: 'misc-business',
  [IndustrySector.LABOR]: 'labor',
  [IndustrySector.IDEOLOGY_SINGLE_ISSUE]: 'ideology-single-issue',
  [IndustrySector.OTHER]: 'other',
};

export function sectorToLeaderboardSlug(sector: IndustrySector): string {
  return SECTOR_TO_LEADERBOARD_SLUG[sector];
}

/** Map IndustrySector enum value to the slug accepted by /api/industry/[sector]. */
export function sectorToIndustrySlug(sector: IndustrySector): string {
  // /api/industry/[sector]/organizations parser accepts hyphenated lower-case names
  // (e.g. "construction", "finance-insurance-real-estate"). Re-use the leaderboard
  // slug — the same shape is accepted by the organizations endpoint.
  return SECTOR_TO_LEADERBOARD_SLUG[sector];
}

export function formatCompactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function partyKey(party: string): 'd' | 'r' | 'i' {
  const upper = (party ?? '').toUpperCase();
  if (upper === 'D' || upper === 'DEM' || upper === 'DEMOCRAT') return 'd';
  if (upper === 'R' || upper === 'REP' || upper === 'REPUBLICAN') return 'r';
  return 'i';
}

export interface PartyTotals {
  d: number;
  r: number;
  i: number;
  total: number;
}

export function computePartyTotals(entries: LeaderboardEntry[]): PartyTotals {
  const totals: PartyTotals = { d: 0, r: 0, i: 0, total: 0 };
  for (const entry of entries) {
    const k = partyKey(entry.party);
    totals[k] += entry.sectorDonationAmount;
    totals.total += entry.sectorDonationAmount;
  }
  return totals;
}

export function topRecipients(entries: LeaderboardEntry[], limit = 6): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.sectorDonationAmount - a.sectorDonationAmount)
    .slice(0, limit);
}

/** Format a Congress.gov bill id ("119-hr-1234") as ("H.R. 1234"). */
export function formatBillNumber(id: string): string {
  const parts = id.split('-');
  if (parts.length < 3) return id;
  const type = (parts[1] ?? '').toUpperCase();
  const number = parts.slice(2).join('-');
  if (type === 'HR') return `H.R. ${number}`;
  if (type === 'S') return `S. ${number}`;
  if (type === 'HJRES') return `H.J.Res. ${number}`;
  if (type === 'SJRES') return `S.J.Res. ${number}`;
  if (type === 'HCONRES') return `H.Con.Res. ${number}`;
  if (type === 'SCONRES') return `S.Con.Res. ${number}`;
  if (type === 'HRES') return `H.Res. ${number}`;
  if (type === 'SRES') return `S.Res. ${number}`;
  return `${type} ${number}`;
}

/** /bills/{congress}/{type}/{number} from a "119-hr-1234" id. */
export function billDetailHref(id: string): string | null {
  const parts = id.split('-');
  if (parts.length < 3) return null;
  const congress = parts[0];
  const type = parts[1];
  const number = parts.slice(2).join('-');
  if (!congress || !type || !number) return null;
  return `/bills/${congress}/${type.toLowerCase()}/${number}`;
}

/**
 * Map an internal BillStatus to a short display label matching the
 * Aicher chip style. Only a couple of statuses get a non-info chip:
 * enacted bills are public laws (green, party-friendly green carries
 * "passed" valence in the reference). Everything else is blue/info.
 */
export interface BillStatusDisplay {
  label: string;
  isPublicLaw: boolean;
}

export function billStatusDisplay(status: string): BillStatusDisplay {
  switch (status) {
    case 'enacted':
      return { label: 'Public law', isPublicLaw: true };
    case 'vetoed':
      return { label: 'Vetoed', isPublicLaw: false };
    case 'pocket_vetoed':
      return { label: 'Vetoed', isPublicLaw: false };
    case 'failed':
      return { label: 'Failed', isPublicLaw: false };
    case 'passed_house':
      return { label: 'Passed House', isPublicLaw: false };
    case 'passed_senate':
      return { label: 'Passed Senate', isPublicLaw: false };
    case 'passed_both':
      return { label: 'Passed both', isPublicLaw: false };
    case 'reported':
      return { label: 'Reported', isPublicLaw: false };
    case 'referred':
      return { label: 'Referred', isPublicLaw: false };
    case 'introduced':
    default:
      return { label: 'Introduced', isPublicLaw: false };
  }
}

export function isoToReadable(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

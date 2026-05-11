/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Server-side fetchers and pure formatters for the SearchVariants chassis.
 *
 * Each fetcher is server-only — they call internal services or government
 * APIs directly. The five listing pages are React Server Components, so
 * data is resolved at render time (no SWR fallback, no client skeletons).
 */

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import type { EnhancedRepresentative } from '@/types/representative';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { FederalRegisterItem } from '@/types/federal-register';
import type { DistrictRow, RegulationRow, SectorRow, StateRow, TopicRow } from './types';

// ── Initials helper (reused by mini-portrait + map placeholder) ──

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function lastNameFor(rep: EnhancedRepresentative): string {
  if (rep.lastName) return rep.lastName;
  const parts = rep.name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? rep.name;
}

// ── State metadata (50 + DC) ────────────────────────

const STATE_META: ReadonlyArray<{
  readonly code: string;
  readonly name: string;
  readonly region: 'Northeast' | 'Midwest' | 'South' | 'West';
}> = [
  { code: 'AL', name: 'Alabama', region: 'South' },
  { code: 'AK', name: 'Alaska', region: 'West' },
  { code: 'AZ', name: 'Arizona', region: 'West' },
  { code: 'AR', name: 'Arkansas', region: 'South' },
  { code: 'CA', name: 'California', region: 'West' },
  { code: 'CO', name: 'Colorado', region: 'West' },
  { code: 'CT', name: 'Connecticut', region: 'Northeast' },
  { code: 'DE', name: 'Delaware', region: 'Northeast' },
  { code: 'FL', name: 'Florida', region: 'South' },
  { code: 'GA', name: 'Georgia', region: 'South' },
  { code: 'HI', name: 'Hawaii', region: 'West' },
  { code: 'ID', name: 'Idaho', region: 'West' },
  { code: 'IL', name: 'Illinois', region: 'Midwest' },
  { code: 'IN', name: 'Indiana', region: 'Midwest' },
  { code: 'IA', name: 'Iowa', region: 'Midwest' },
  { code: 'KS', name: 'Kansas', region: 'Midwest' },
  { code: 'KY', name: 'Kentucky', region: 'South' },
  { code: 'LA', name: 'Louisiana', region: 'South' },
  { code: 'ME', name: 'Maine', region: 'Northeast' },
  { code: 'MD', name: 'Maryland', region: 'Northeast' },
  { code: 'MA', name: 'Massachusetts', region: 'Northeast' },
  { code: 'MI', name: 'Michigan', region: 'Midwest' },
  { code: 'MN', name: 'Minnesota', region: 'Midwest' },
  { code: 'MS', name: 'Mississippi', region: 'South' },
  { code: 'MO', name: 'Missouri', region: 'Midwest' },
  { code: 'MT', name: 'Montana', region: 'West' },
  { code: 'NE', name: 'Nebraska', region: 'Midwest' },
  { code: 'NV', name: 'Nevada', region: 'West' },
  { code: 'NH', name: 'New Hampshire', region: 'Northeast' },
  { code: 'NJ', name: 'New Jersey', region: 'Northeast' },
  { code: 'NM', name: 'New Mexico', region: 'West' },
  { code: 'NY', name: 'New York', region: 'Northeast' },
  { code: 'NC', name: 'North Carolina', region: 'South' },
  { code: 'ND', name: 'North Dakota', region: 'Midwest' },
  { code: 'OH', name: 'Ohio', region: 'Midwest' },
  { code: 'OK', name: 'Oklahoma', region: 'South' },
  { code: 'OR', name: 'Oregon', region: 'West' },
  { code: 'PA', name: 'Pennsylvania', region: 'Northeast' },
  { code: 'RI', name: 'Rhode Island', region: 'Northeast' },
  { code: 'SC', name: 'South Carolina', region: 'South' },
  { code: 'SD', name: 'South Dakota', region: 'Midwest' },
  { code: 'TN', name: 'Tennessee', region: 'South' },
  { code: 'TX', name: 'Texas', region: 'South' },
  { code: 'UT', name: 'Utah', region: 'West' },
  { code: 'VT', name: 'Vermont', region: 'Northeast' },
  { code: 'VA', name: 'Virginia', region: 'South' },
  { code: 'WA', name: 'Washington', region: 'West' },
  { code: 'WV', name: 'West Virginia', region: 'South' },
  { code: 'WI', name: 'Wisconsin', region: 'Midwest' },
  { code: 'WY', name: 'Wyoming', region: 'West' },
];

// ── District fetcher ────────────────────────────────

interface DistrictApiShape {
  readonly id: string;
  readonly state: string;
  readonly number: string;
  readonly representative: {
    readonly name: string;
    readonly bioguideId: string;
  };
  readonly demographics: {
    readonly population: number;
  };
}

interface DistrictApiResponse {
  readonly districts: ReadonlyArray<DistrictApiShape>;
}

function pickBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

export async function fetchDistrictsForListing(
  stateFilter: string | null
): Promise<ReadonlyArray<DistrictRow>> {
  try {
    const res = await fetch(`${pickBaseUrl()}/api/districts/all`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as DistrictApiResponse;
    const rows: DistrictRow[] = json.districts.map(d => ({
      id: d.id,
      code: `${d.state}-${d.number}`,
      state: d.state,
      number: d.number,
      rep: {
        name: d.representative.name,
        initials: initialsFor(d.representative.name),
        bioguideId: d.representative.bioguideId,
      },
      population: d.demographics.population,
      href: `/districts/${d.state.toLowerCase()}/${d.number}`,
    }));
    return stateFilter ? rows.filter(r => r.state === stateFilter) : rows;
  } catch {
    return [];
  }
}

// ── State fetcher ───────────────────────────────────

export async function fetchStatesForListing(
  regionFilter: string | null
): Promise<ReadonlyArray<StateRow>> {
  let members: EnhancedRepresentative[] = [];
  try {
    members = await getAllEnhancedRepresentatives();
  } catch {
    members = [];
  }

  const byState = new Map<string, EnhancedRepresentative[]>();
  for (const m of members) {
    const list = byState.get(m.state) ?? [];
    list.push(m);
    byState.set(m.state, list);
  }

  const filtered = regionFilter ? STATE_META.filter(s => s.region === regionFilter) : STATE_META;

  return filtered.map(meta => {
    const stateMembers = byState.get(meta.code) ?? [];
    const house = stateMembers.filter(m => m.chamber === 'House');
    const senators = stateMembers
      .filter(m => m.chamber === 'Senate')
      .slice(0, 2)
      .map(s => ({
        bioguideId: s.bioguideId,
        lastName: lastNameFor(s),
        fullName: s.name,
      }));

    let democrats = 0;
    let republicans = 0;
    let independents = 0;
    for (const h of house) {
      const p = h.party.toUpperCase();
      if (p.startsWith('D')) democrats += 1;
      else if (p.startsWith('R')) republicans += 1;
      else independents += 1;
    }

    return {
      code: meta.code,
      name: meta.name,
      region: meta.region,
      house: {
        democrats,
        republicans,
        independents,
        total: house.length,
      },
      senators,
      href: `/state-legislature/${meta.code.toLowerCase()}`,
    } satisfies StateRow;
  });
}

// ── Sector fetcher ──────────────────────────────────

const SECTOR_SLUGS: ReadonlyArray<{ readonly slug: string; readonly name: IndustrySector }> = [
  { slug: 'agribusiness', name: IndustrySector.AGRIBUSINESS },
  { slug: 'communications-electronics', name: IndustrySector.COMMUNICATIONS_ELECTRONICS },
  { slug: 'construction', name: IndustrySector.CONSTRUCTION },
  { slug: 'defense', name: IndustrySector.DEFENSE },
  { slug: 'energy-natural-resources', name: IndustrySector.ENERGY_NATURAL_RESOURCES },
  { slug: 'finance-insurance-real-estate', name: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE },
  { slug: 'health', name: IndustrySector.HEALTH },
  { slug: 'lawyers-lobbyists', name: IndustrySector.LAWYERS_LOBBYISTS },
  { slug: 'transportation', name: IndustrySector.TRANSPORTATION },
  { slug: 'misc-business', name: IndustrySector.MISC_BUSINESS },
  { slug: 'labor', name: IndustrySector.LABOR },
  { slug: 'ideology-single-issue', name: IndustrySector.IDEOLOGY_SINGLE_ISSUE },
];

export function fetchSectorsForListing(): ReadonlyArray<SectorRow> {
  return SECTOR_SLUGS.map(s => ({
    slug: s.slug,
    name: s.name,
    href: `/industry/${s.slug}`,
  }));
}

// ── Regulation fetcher ──────────────────────────────

interface RegulationApiResponse {
  readonly success: boolean;
  readonly items: ReadonlyArray<FederalRegisterItem>;
  readonly pagination: {
    readonly total: number;
  };
}

export async function fetchRegulationsForListing(
  agencyFilter: string | null,
  commentStatus: 'all' | 'open' | 'closed'
): Promise<{
  readonly rows: ReadonlyArray<RegulationRow>;
  readonly total: number;
  readonly agencies: ReadonlyArray<{ readonly name: string; readonly count: number }>;
}> {
  try {
    const params = new URLSearchParams({ page: '1', per_page: '50' });
    if (commentStatus === 'open') params.set('open_for_comment', 'true');
    if (agencyFilter) params.set('agency', agencyFilter);

    const res = await fetch(`${pickBaseUrl()}/api/federal-register?${params.toString()}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return { rows: [], total: 0, agencies: [] };
    }
    const json = (await res.json()) as RegulationApiResponse;
    const today = Date.now();

    const filtered =
      commentStatus === 'closed'
        ? json.items.filter(it => !it.isOpenForComment)
        : commentStatus === 'open'
          ? json.items.filter(it => it.isOpenForComment)
          : json.items;

    const rows: RegulationRow[] = filtered.map(it => ({
      id: it.id,
      title: it.title,
      agency: it.agency,
      docNumber: it.id,
      publishedDate: it.publishedDate,
      commentsCloseOn: it.commentsCloseOn ?? null,
      isOpenForComment:
        Boolean(it.commentsCloseOn) && new Date(it.commentsCloseOn ?? 0).getTime() > today,
      href: `/regulations/${encodeURIComponent(it.id)}`,
    }));

    const agencyCounts = new Map<string, number>();
    for (const it of json.items) {
      agencyCounts.set(it.agency, (agencyCounts.get(it.agency) ?? 0) + 1);
    }
    const agencies = Array.from(agencyCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { rows, total: json.pagination?.total ?? rows.length, agencies };
  } catch {
    return { rows: [], total: 0, agencies: [] };
  }
}

// ── Topic fetcher ───────────────────────────────────
// Twelve hand-curated topics. Bill / rep counts deferred — see TopicListingPage.

const TOPICS: ReadonlyArray<{
  readonly slug: string;
  readonly name: string;
  readonly subtitle: string;
}> = [
  {
    slug: 'healthcare',
    name: 'Healthcare',
    subtitle: 'Medicare, Medicaid, ACA, drug pricing, public health',
  },
  {
    slug: 'economy',
    name: 'Economy and jobs',
    subtitle: 'Employment, wages, trade, small business, manufacturing',
  },
  {
    slug: 'education',
    name: 'Education',
    subtitle: 'K-12, higher education, student loans, early childhood',
  },
  {
    slug: 'environment',
    name: 'Environment and climate',
    subtitle: 'Climate change, EPA, clean energy, conservation',
  },
  {
    slug: 'defense',
    name: 'Defense and military',
    subtitle: 'National defense, veterans affairs, military spending',
  },
  {
    slug: 'immigration',
    name: 'Immigration',
    subtitle: 'Border security, visas, citizenship, asylum',
  },
  {
    slug: 'infrastructure',
    name: 'Infrastructure',
    subtitle: 'Transportation, broadband, water systems, energy grid',
  },
  {
    slug: 'justice',
    name: 'Criminal justice',
    subtitle: 'Policing reform, sentencing, courts, civil rights',
  },
  {
    slug: 'technology',
    name: 'Technology and privacy',
    subtitle: 'Big tech regulation, data privacy, AI, cybersecurity',
  },
  {
    slug: 'agriculture',
    name: 'Agriculture',
    subtitle: 'Farm policy, food safety, rural development, nutrition',
  },
  {
    slug: 'finance',
    name: 'Banking and finance',
    subtitle: 'Banking regulation, housing, consumer protection',
  },
  {
    slug: 'foreign-policy',
    name: 'Foreign policy',
    subtitle: 'International relations, treaties, foreign aid',
  },
];

export function fetchTopicsForListing(): ReadonlyArray<TopicRow> {
  return TOPICS.map(t => ({
    slug: t.slug,
    name: t.name,
    subtitle: t.subtitle,
    href: `/topics/${t.slug}`,
  }));
}

// ── Formatters ──────────────────────────────────────

export function formatNumberWithCommas(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function formatShortDate(iso: string | null): string {
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

export const TODAY_LABEL = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

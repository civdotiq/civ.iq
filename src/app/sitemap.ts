/**
 * Main Sitemap - Optimized for Maximum SEO
 *
 * Strategy:
 * - Use static data where possible (faster, more reliable)
 * - Granular priorities based on search intent
 * - Accurate change frequencies
 * - Comprehensive page coverage
 * - lastModified only where the data gives a real date for the page's facts.
 *   Never the build or request time: a URL with no known date has none.
 */

import type { MetadataRoute } from 'next';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

export const dynamic = 'force-dynamic';

import committeesData from '@/data/committees-with-subcommittees.json';
import { RACES_2026 } from '@/data/elections-2026-races';
import { CIVIC_GLOSSARY } from '@/lib/data/civic-glossary';
import { EDUCATION_CURRICULUM } from '@/lib/data/education-curriculum';
import { getTemplatesByEntityType, slugifyPolicyArea } from '@/lib/questions/question-registry';
import { getAllPolicyAreas } from '@/lib/connections/policy-area-map';
import { getBillsByPolicyArea } from '@/lib/data-sources/bill-policy-areas/load';
import { getMembersWithStockTrades } from '@/lib/questions/stock-trades';
import { firstDistrictPerChamber } from '@/lib/sitemap/state-district-urls';
import { houseDistrictIds } from '@/lib/districts/known-districts';
import { buildBillUrl } from '@/lib/helpers/url-builders';
import { latestCompleteWeekId, previousWeekIds } from '@/lib/digest/week';
import { PUBLISHED_SECTORS } from '@/lib/industry/published-sectors';
import { houseVoteUrls, senateVoteUrls } from '@/lib/sitemap/vote-urls';

const BASE_URL = 'https://civdotiq.org';

// All 50 states + DC + territories
const ALL_REGIONS = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
  'PR',
  'VI',
  'GU',
  'AS',
  'MP',
] as const;

// States only (no territories) - for state legislature pages
const STATES_ONLY = ALL_REGIONS.filter(s => !['DC', 'PR', 'VI', 'GU', 'AS', 'MP'].includes(s));

// High-population states get higher priority (more search volume)
const HIGH_POP_STATES = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

interface CommitteeData {
  committeeId: string;
  committeeName: string;
  chamber: string;
  subcommittees?: Array<{ code: string; name: string }>;
}

/** A YYYY-MM-DD date from upstream data, or undefined when absent or malformed. */
function sourceDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Type the imported data
const committees = committeesData.committees as Record<string, CommitteeData>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ===========================================
  // TIER 1: HIGHEST PRIORITY (1.0) - Core Pages
  // ===========================================

  // Homepage - Most important
  entries.push({
    url: BASE_URL,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // ===========================================
  // TIER 2: HIGH PRIORITY (0.9) - Representatives
  // These are the most searched pages
  // ===========================================

  // Fetch representatives - these are the money pages
  try {
    const res = await fetch(`${BASE_URL}/api/representatives/all`, {
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      const representatives = data.representatives || data || [];

      for (const rep of representatives) {
        if (rep.bioguideId) {
          // Senators get slightly higher priority (more searches)
          const isSenator = rep.chamber === 'Senate';
          const isHighPopState = HIGH_POP_STATES.includes(rep.state);

          entries.push({
            url: `${BASE_URL}/representative/${rep.bioguideId}`,
            changeFrequency: 'weekly',
            priority: isSenator ? 0.95 : isHighPopState ? 0.9 : 0.85,
          });

          // Incumbent Record Card
          entries.push({
            url: `${BASE_URL}/representative/${rep.bioguideId}/record`,
            changeFrequency: 'weekly',
            priority: isSenator ? 0.9 : isHighPopState ? 0.85 : 0.8,
          });
        }
      }

      // Question pages: representative templates × all representatives.
      // stock-trades is listed only for members with 119th-Congress trades;
      // the rest render an empty, noindexed page. A cold trades cache can take
      // tens of seconds, so past the timeout those entries are skipped this
      // run (the lookup keeps warming the cache for the next one).
      const repSlugs = getTemplatesByEntityType('representative').map(t => t.slug);
      const tradeMembers = await Promise.race([
        getMembersWithStockTrades().catch(() => null),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 10_000)),
      ]);
      const hasTrades = (rep: { bioguideId: string; chamber?: string }): boolean =>
        (rep.chamber === 'Senate' ? tradeMembers?.senate : tradeMembers?.house)?.includes(
          rep.bioguideId
        ) ?? false;
      for (const rep of representatives) {
        if (rep.bioguideId) {
          for (const qSlug of repSlugs) {
            if (qSlug === 'stock-trades' && !hasTrades(rep)) continue;
            entries.push({
              url: `${BASE_URL}/ask/${qSlug}/${rep.bioguideId}`,
              changeFrequency: 'weekly',
              priority: 0.75,
            });
          }
        }
      }
    }
  } catch {
    // Silently fail - other entries will still be generated
  }

  // Topic question pages: topic-bills × policy areas that have bills in the
  // corpus. An area with none renders empty and is noindexed, so listing it
  // would only invite a soft 404. Corpus unavailable → list none.
  for (const area of getAllPolicyAreas()) {
    const areaBills = await getBillsByPolicyArea(area, 0);
    if (!areaBills?.total) continue;
    entries.push({
      url: `${BASE_URL}/ask/topic-bills/${slugifyPolicyArea(area)}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Committee question pages: committee templates × all committees
  const committeeSlugs = getTemplatesByEntityType('committee').map(t => t.slug);
  for (const code of Object.keys(committees)) {
    for (const qSlug of committeeSlugs) {
      entries.push({
        url: `${BASE_URL}/ask/${qSlug}/${code}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // ===========================================
  // TIER 3: MEDIUM-HIGH PRIORITY (0.8) - Navigation & Hub Pages
  // ===========================================

  // Main navigation pages
  const mainPages = [
    { path: '/congress', priority: 0.9, freq: 'weekly' as const }, // Hub page - high priority
    { path: '/committees', priority: 0.85, freq: 'weekly' as const },
    { path: '/legislation', priority: 0.8, freq: 'daily' as const },
    { path: '/states', priority: 0.85, freq: 'weekly' as const }, // States hub page
    { path: '/topics', priority: 0.85, freq: 'weekly' as const }, // Topics hub page
    { path: '/glossary', priority: 0.8, freq: 'monthly' as const }, // Glossary index
    { path: '/representatives', priority: 0.8, freq: 'weekly' as const },
    { path: '/districts', priority: 0.75, freq: 'weekly' as const },
    { path: '/education', priority: 0.7, freq: 'monthly' as const },
    { path: '/data-sources', priority: 0.5, freq: 'monthly' as const },
  ];

  // ===========================================
  // TOPIC HUB PAGES - High SEO value
  // ===========================================
  const topicPages = [
    'healthcare',
    'economy',
    'education',
    'environment',
    'defense',
    'immigration',
    'infrastructure',
    'justice',
    'technology',
    'agriculture',
    'finance',
    'foreign-policy',
  ];

  for (const topic of topicPages) {
    entries.push({
      url: `${BASE_URL}/topics/${topic}`,
      changeFrequency: 'weekly',
      priority: 0.75,
    });
  }

  // ===========================================
  // GLOSSARY TERM PAGES - Long-tail SEO
  // ===========================================
  for (const term of CIVIC_GLOSSARY) {
    const slug = term.term.toLowerCase().replace(/\s+/g, '-');
    entries.push({
      url: `${BASE_URL}/glossary/${slug}`,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  // ===========================================
  // EDUCATION LESSON PAGES - Individual lesson detail
  // ===========================================
  for (const lesson of EDUCATION_CURRICULUM) {
    entries.push({
      url: `${BASE_URL}/education/${lesson.id.toLowerCase()}`,
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  }

  // ===========================================
  // INDUSTRY SECTOR PAGES
  // ===========================================
  const industrySectors = PUBLISHED_SECTORS.map(s => s.slug);

  // Industry hub page
  entries.push({
    url: `${BASE_URL}/industry`,
    changeFrequency: 'weekly',
    priority: 0.7,
  });

  for (const sector of industrySectors) {
    entries.push({
      url: `${BASE_URL}/industry/${sector}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // ===========================================
  // EMBED DOCUMENTATION
  // ===========================================
  entries.push({
    url: `${BASE_URL}/embed-docs`,
    changeFrequency: 'monthly',
    priority: 0.5,
  });

  // ===========================================
  // STATIC PAGES - Missing from sitemap
  // ===========================================
  const staticPages = [
    { path: '/comment-periods', priority: 0.6, freq: 'daily' as const },
    { path: '/executive-orders', priority: 0.6, freq: 'daily' as const },
    { path: '/your-reps', priority: 0.7, freq: 'monthly' as const },
    { path: '/influence', priority: 0.65, freq: 'weekly' as const },
    { path: '/regulations', priority: 0.55, freq: 'daily' as const },
    { path: '/investigate', priority: 0.5, freq: 'monthly' as const },
    { path: '/open', priority: 0.5, freq: 'monthly' as const },
    { path: '/developers', priority: 0.7, freq: 'monthly' as const },
    { path: '/mcp', priority: 0.7, freq: 'monthly' as const },
    { path: '/digest', priority: 0.7, freq: 'weekly' as const },
    { path: '/elections', priority: 0.65, freq: 'monthly' as const },
    { path: '/elections/2026', priority: 0.75, freq: 'weekly' as const },
    { path: '/elections/2026/how-to-vote', priority: 0.75, freq: 'weekly' as const },
    { path: '/elections/federal', priority: 0.6, freq: 'monthly' as const },
    { path: '/elections/state', priority: 0.6, freq: 'monthly' as const },
    { path: '/federal', priority: 0.7, freq: 'monthly' as const },
    { path: '/enforcement', priority: 0.55, freq: 'weekly' as const },
    { path: '/spending', priority: 0.6, freq: 'weekly' as const },
    { path: '/about', priority: 0.4, freq: 'monthly' as const },
    { path: '/privacy', priority: 0.2, freq: 'yearly' as const },
    { path: '/accessibility', priority: 0.2, freq: 'yearly' as const },
    { path: '/terms', priority: 0.2, freq: 'yearly' as const },
    { path: '/disclaimer', priority: 0.2, freq: 'yearly' as const },
    { path: '/docs/api', priority: 0.6, freq: 'monthly' as const },
    { path: '/migrate/google-civic', priority: 0.5, freq: 'monthly' as const },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      changeFrequency: page.freq,
      priority: page.priority,
    });
  }

  // ===========================================
  // 2026 RACE PAGES - every federal seat up in 2026, from the committed
  // FEC race-skeleton corpus (see scripts/sync-races-2026.ts)
  // ===========================================
  for (const race of RACES_2026) {
    entries.push({
      url: `${BASE_URL}/elections/${race.raceId}`,
      changeFrequency: 'weekly',
      priority: race.office === 'S' ? 0.7 : 0.6,
    });
  }

  // ===========================================
  // VOTE PAGES: every roll call the real lists hold, dated by the day held
  // ===========================================
  {
    const congress = getCurrentCongressNumber();
    const now = new Date();
    const [senateVotes, houseVotes] = await Promise.all([
      senateVoteUrls(congress, now).catch(() => []),
      houseVoteUrls(congress, now).catch(() => []),
    ]);
    for (const vote of [...senateVotes, ...houseVotes]) {
      entries.push({
        url: `${BASE_URL}${vote.path}`,
        lastModified: sourceDate(vote.date),
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }
  }

  for (const page of mainPages) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      changeFrequency: page.freq,
      priority: page.priority,
    });
  }

  // ===========================================
  // TIER 4: MEDIUM PRIORITY (0.7) - State/District Pages
  // ===========================================

  // State delegation pages - high search volume
  for (const state of ALL_REGIONS) {
    const isHighPop = HIGH_POP_STATES.includes(state);
    entries.push({
      url: `${BASE_URL}/delegation/${state}`,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.8 : 0.7,
    });
  }

  // Per-state weekly digest: one archive page per state plus the last
  // DIGEST_ARCHIVE_WEEKS issue pages. Bounded on purpose — older issues stay
  // reachable through each state's archive page (which the crawler follows),
  // so this is a recency window, not the full history. Canonical digest URLs
  // are lowercase (/digest/{state}/{week}); keep in sync with the route.
  const DIGEST_ARCHIVE_WEEKS = 12;
  const digestWeeks = previousWeekIds(latestCompleteWeekId(), DIGEST_ARCHIVE_WEEKS);
  for (const state of ALL_REGIONS) {
    const isHighPop = HIGH_POP_STATES.includes(state);
    const code = state.toLowerCase();
    entries.push({
      url: `${BASE_URL}/digest/${code}`,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.7 : 0.6,
    });
    for (const week of digestWeeks) {
      entries.push({
        url: `${BASE_URL}/digest/${code}/${week}`,
        changeFrequency: 'monthly',
        priority: isHighPop ? 0.6 : 0.5,
      });
    }
  }

  // Congressional district pages
  // Format: STATE-DISTRICT (e.g., MI-12, CA-04, AK-AL for at-large)
  for (const districtId of houseDistrictIds()) {
    const isHighPop = HIGH_POP_STATES.includes(districtId.slice(0, 2));
    entries.push({
      url: `${BASE_URL}/districts/${districtId}`,
      changeFrequency: 'monthly',
      priority: isHighPop ? 0.7 : 0.6,
    });
  }

  // ===========================================
  // TIER 5: MEDIUM PRIORITY (0.65) - Committees
  // Using static data for reliability
  // ===========================================

  for (const [code, committee] of Object.entries(committees)) {
    // Main committee page
    entries.push({
      url: `${BASE_URL}/committee/${code}`,
      changeFrequency: 'weekly',
      priority: committee.chamber === 'Joint' ? 0.6 : 0.7,
    });

    // Subcommittee pages
    if (committee.subcommittees) {
      for (const sub of committee.subcommittees) {
        entries.push({
          url: `${BASE_URL}/committee/${sub.code}`,
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  }

  // ===========================================
  // TIER 6: MEDIUM PRIORITY (0.6) - State Legislature
  // ===========================================

  for (const state of STATES_ONLY) {
    const stateLower = state.toLowerCase();
    const isHighPop = HIGH_POP_STATES.includes(state);

    // Main state legislature page
    entries.push({
      url: `${BASE_URL}/state-legislature/${stateLower}`,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.7 : 0.6,
    });

    // State committees page
    entries.push({
      url: `${BASE_URL}/state-legislature/${stateLower}/committees`,
      changeFrequency: 'monthly',
      priority: 0.4,
    });

    // Whole-state overview (lowercase is canonical; /states/MI 308s here)
    entries.push({
      url: `${BASE_URL}/states/${stateLower}`,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.7 : 0.6,
    });
  }
  // DC's council and Puerto Rico's Legislative Assembly have rosters in the
  // corpus too, so their "Who is my …?" hubs are real pages. Their overviews
  // have a chief executive, a delegate and ACS figures. The other territories'
  // don't (no roster, no ACS), so they stay out.
  for (const code of ['dc', 'pr']) {
    entries.push(
      {
        url: `${BASE_URL}/state-legislature/${code}`,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
      {
        url: `${BASE_URL}/states/${code}`,
        changeFrequency: 'weekly',
        priority: 0.6,
      }
    );
  }
  // Individual legislator profiles are in /sitemap-state-legislators.xml.

  // ===========================================
  // TIER 7: LOWER PRIORITY (0.5) - Bills
  // Fresh content, good for news searches
  // ===========================================

  try {
    const res = await fetch(`${BASE_URL}/api/bills/latest?limit=200`, {
      next: { revalidate: 3600 }, // Refresh hourly for fresh bills
    });

    if (res.ok) {
      const data = await res.json();
      const bills = data.bills || data || [];

      for (const bill of bills) {
        // The bill route needs the canonical <congress>-<type>-<number> slug;
        // a bare number (the only id Congress.gov's list endpoint provides) 404s.
        if (bill.congress && bill.type && bill.number) {
          entries.push({
            url: `${BASE_URL}${buildBillUrl(bill.congress, bill.type, bill.number)}`,
            lastModified: sourceDate(bill.latestAction?.actionDate),
            changeFrequency: 'daily',
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // Silently fail
  }

  // ===========================================
  // TIER 8: STATE DISTRICT MAPS
  // Long-tail SEO opportunity
  // ===========================================

  // State districts index page
  entries.push({
    url: `${BASE_URL}/state-districts`,
    changeFrequency: 'monthly',
    priority: 0.6,
  });

  // State bills search page
  entries.push({
    url: `${BASE_URL}/state-bills`,
    changeFrequency: 'daily',
    priority: 0.6,
  });

  const stateDistricts = await Promise.all(STATES_ONLY.map(firstDistrictPerChamber));
  STATES_ONLY.forEach((state, i) => {
    const stateLower = state.toLowerCase();

    // State bills by state
    entries.push({
      url: `${BASE_URL}/state-bills/${stateLower}`,
      changeFrequency: 'daily',
      priority: 0.5,
    });

    // Route is /state-districts/[state]/[chamber]/[district] (no chamber-level
    // route). One real district per chamber from the roster corpus — district
    // names vary by state, so "1" does not exist everywhere.
    for (const { chamber, district } of stateDistricts[i] ?? []) {
      entries.push({
        url: `${BASE_URL}/state-districts/${stateLower}/${chamber}/${encodeURIComponent(district)}`,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  });

  return entries;
}

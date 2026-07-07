/**
 * Main Sitemap - Optimized for Maximum SEO
 *
 * Strategy:
 * - Use static data where possible (faster, more reliable)
 * - Granular priorities based on search intent
 * - Accurate change frequencies
 * - Comprehensive page coverage
 */

import type { MetadataRoute } from 'next';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

export const dynamic = 'force-dynamic';

import committeesData from '@/data/committees-with-subcommittees.json';
import { CIVIC_GLOSSARY } from '@/lib/data/civic-glossary';
import { EDUCATION_CURRICULUM } from '@/lib/data/education-curriculum';
import { getTemplatesByEntityType, slugifyPolicyArea } from '@/lib/questions/question-registry';
import { getAllPolicyAreas } from '@/lib/connections/policy-area-map';
import { buildBillUrl } from '@/lib/helpers/url-builders';

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

// Congressional districts per state (119th Congress)
const DISTRICTS_PER_STATE: Record<string, number> = {
  AL: 7,
  AK: 1,
  AZ: 9,
  AR: 4,
  CA: 52,
  CO: 8,
  CT: 5,
  DE: 1,
  FL: 28,
  GA: 14,
  HI: 2,
  ID: 2,
  IL: 17,
  IN: 9,
  IA: 4,
  KS: 4,
  KY: 6,
  LA: 6,
  ME: 2,
  MD: 8,
  MA: 9,
  MI: 13,
  MN: 8,
  MS: 4,
  MO: 8,
  MT: 2,
  NE: 3,
  NV: 4,
  NH: 2,
  NJ: 12,
  NM: 3,
  NY: 26,
  NC: 14,
  ND: 1,
  OH: 15,
  OK: 5,
  OR: 6,
  PA: 17,
  RI: 2,
  SC: 7,
  SD: 1,
  TN: 9,
  TX: 38,
  UT: 4,
  VT: 1,
  VA: 11,
  WA: 10,
  WV: 2,
  WI: 8,
  WY: 1,
  DC: 1,
  PR: 1,
  VI: 1,
  GU: 1,
  AS: 1,
  MP: 1,
};

interface CommitteeData {
  committeeId: string;
  committeeName: string;
  chamber: string;
  lastUpdated?: string;
  subcommittees?: Array<{ code: string; name: string }>;
}

// Type the imported data
const committees = committeesData.committees as Record<string, CommitteeData>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // ===========================================
  // TIER 1: HIGHEST PRIORITY (1.0) - Core Pages
  // ===========================================

  // Homepage - Most important
  entries.push({
    url: BASE_URL,
    lastModified: now,
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
            lastModified: now,
            changeFrequency: 'weekly',
            priority: isSenator ? 0.95 : isHighPopState ? 0.9 : 0.85,
          });
        }
      }

      // Question pages: representative templates × all representatives
      const repSlugs = getTemplatesByEntityType('representative').map(t => t.slug);
      for (const rep of representatives) {
        if (rep.bioguideId) {
          for (const qSlug of repSlugs) {
            entries.push({
              url: `${BASE_URL}/ask/${qSlug}/${rep.bioguideId}`,
              lastModified: now,
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

  // Topic question pages: topic-bills × all policy areas
  for (const area of getAllPolicyAreas()) {
    entries.push({
      url: `${BASE_URL}/ask/topic-bills/${slugifyPolicyArea(area)}`,
      lastModified: now,
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
        lastModified: now,
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
    { path: '/local', priority: 0.5, freq: 'monthly' as const },
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
      lastModified: now,
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
      lastModified: now,
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
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  }

  // ===========================================
  // INDUSTRY SECTOR PAGES
  // ===========================================
  const industrySectors = [
    'agribusiness',
    'communications-electronics',
    'construction',
    'defense',
    'energy-natural-resources',
    'finance-insurance-real-estate',
    'health',
    'transportation',
    'misc-business',
    'labor',
  ];

  // Industry hub page
  entries.push({
    url: `${BASE_URL}/industry`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  });

  for (const sector of industrySectors) {
    entries.push({
      url: `${BASE_URL}/industry/${sector}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // ===========================================
  // EMBED DOCUMENTATION
  // ===========================================
  entries.push({
    url: `${BASE_URL}/embed-docs`,
    lastModified: now,
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
    { path: '/elections', priority: 0.65, freq: 'monthly' as const },
    { path: '/elections/federal', priority: 0.6, freq: 'monthly' as const },
    { path: '/elections/state', priority: 0.6, freq: 'monthly' as const },
    { path: '/federal', priority: 0.7, freq: 'monthly' as const },
    { path: '/enforcement', priority: 0.55, freq: 'weekly' as const },
    { path: '/spending', priority: 0.6, freq: 'weekly' as const },
    { path: '/about', priority: 0.4, freq: 'monthly' as const },
    { path: '/privacy', priority: 0.2, freq: 'yearly' as const },
    { path: '/terms', priority: 0.2, freq: 'yearly' as const },
    { path: '/disclaimer', priority: 0.2, freq: 'yearly' as const },
    { path: '/docs/api', priority: 0.6, freq: 'monthly' as const },
    { path: '/migrate/google-civic', priority: 0.5, freq: 'monthly' as const },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      lastModified: now,
      changeFrequency: page.freq,
      priority: page.priority,
    });
  }

  // ===========================================
  // VOTE PAGES - Unclaimed search space
  // Senate and House roll call votes for 119th Congress
  // ===========================================
  try {
    // Generate vote IDs for the current congress session
    // Senate votes: senate-{congress}-{session}-{rollNumber}
    // House votes: house-{congress}-{session}-{rollNumber}
    // Session 1 = odd calendar year, session 2 = even (roll numbers reset
    // each session, and /api/votes/recent returns current-session rolls).
    const congress = getCurrentCongressNumber();
    const session = new Date().getUTCFullYear() % 2 === 1 ? 1 : 2;

    // Fetch recent votes to determine current roll numbers
    const [senateRes, houseRes] = await Promise.allSettled([
      fetch(`${BASE_URL}/api/votes/recent?chamber=senate&limit=1`, {
        next: { revalidate: 86400 },
      }),
      fetch(`${BASE_URL}/api/votes/recent?chamber=house&limit=1`, {
        next: { revalidate: 86400 },
      }),
    ]);

    let maxSenateRoll = 200; // fallback estimate
    let maxHouseRoll = 300; // fallback estimate

    if (senateRes.status === 'fulfilled' && senateRes.value.ok) {
      const data = await senateRes.value.json();
      const votes = data.votes || [];
      if (votes.length > 0 && votes[0].rollNumber) {
        maxSenateRoll = votes[0].rollNumber;
      }
    }

    if (houseRes.status === 'fulfilled' && houseRes.value.ok) {
      const data = await houseRes.value.json();
      const votes = data.votes || [];
      if (votes.length > 0 && votes[0].rollNumber) {
        maxHouseRoll = votes[0].rollNumber;
      }
    }

    for (let roll = 1; roll <= maxSenateRoll; roll++) {
      entries.push({
        url: `${BASE_URL}/vote/senate-${congress}-${session}-${roll}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }

    for (let roll = 1; roll <= maxHouseRoll; roll++) {
      entries.push({
        url: `${BASE_URL}/vote/house-${congress}-${session}-${roll}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    }
  } catch {
    // Silently fail - other entries will still be generated
  }

  for (const page of mainPages) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.8 : 0.7,
    });
  }

  // Congressional district pages
  // Format: STATE-DISTRICT (e.g., MI-12, CA-04, AK-AL for at-large)
  for (const [state, count] of Object.entries(DISTRICTS_PER_STATE)) {
    const isHighPop = HIGH_POP_STATES.includes(state);
    for (let i = 1; i <= count; i++) {
      const districtId = count === 1 ? `${state}-AL` : `${state}-${String(i).padStart(2, '0')}`;
      entries.push({
        url: `${BASE_URL}/districts/${districtId}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: isHighPop ? 0.7 : 0.6,
      });
    }
  }

  // ===========================================
  // TIER 5: MEDIUM PRIORITY (0.65) - Committees
  // Using static data for reliability
  // ===========================================

  for (const [code, committee] of Object.entries(committees)) {
    // Main committee page
    entries.push({
      url: `${BASE_URL}/committee/${code}`,
      lastModified: committee.lastUpdated ? new Date(committee.lastUpdated) : now,
      changeFrequency: 'weekly',
      priority: committee.chamber === 'Joint' ? 0.6 : 0.7,
    });

    // Subcommittee pages
    if (committee.subcommittees) {
      for (const sub of committee.subcommittees) {
        entries.push({
          url: `${BASE_URL}/committee/${sub.code}`,
          lastModified: committee.lastUpdated ? new Date(committee.lastUpdated) : now,
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
      lastModified: now,
      changeFrequency: 'weekly',
      priority: isHighPop ? 0.7 : 0.6,
    });

    // State committees page
    entries.push({
      url: `${BASE_URL}/state-legislature/${stateLower}/committees`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  }

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
            lastModified: bill.latestAction?.date ? new Date(bill.latestAction.date) : now,
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
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  });

  // State bills search page
  entries.push({
    url: `${BASE_URL}/state-bills`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  });

  const chambers = ['upper', 'lower'] as const;
  for (const state of STATES_ONLY) {
    const stateLower = state.toLowerCase();

    // State bills by state
    entries.push({
      url: `${BASE_URL}/state-bills/${stateLower}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    });

    for (const chamber of chambers) {
      // Route is /state-districts/[state]/[chamber]/[district]; district 1 is the
      // canonical entry point used by the state-districts index page. Omitting the
      // district segment 404s (no /state-districts/[state]/[chamber] route exists).
      entries.push({
        url: `${BASE_URL}/state-districts/${stateLower}/${chamber}/1`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  }

  return entries;
}

/**
 * Main Sitemap - Optimized for Maximum SEO
 *
 * Strategy:
 * - Use static data where possible (faster, more reliable)
 * - Granular priorities based on search intent
 * - Accurate change frequencies
 * - Comprehensive page coverage
 */

import { MetadataRoute } from 'next';
import committeesData from '@/data/committees-with-subcommittees.json';

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
    }
  } catch {
    // Silently fail - other entries will still be generated
  }

  // ===========================================
  // TIER 3: MEDIUM-HIGH PRIORITY (0.8) - Navigation
  // ===========================================

  // Main navigation pages
  const mainPages = [
    { path: '/congress', priority: 0.9, freq: 'weekly' as const }, // Hub page - high priority
    { path: '/committees', priority: 0.85, freq: 'weekly' as const },
    { path: '/legislation', priority: 0.8, freq: 'daily' as const },
    { path: '/data-sources', priority: 0.5, freq: 'monthly' as const },
  ];

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
  for (const [state, count] of Object.entries(DISTRICTS_PER_STATE)) {
    const isHighPop = HIGH_POP_STATES.includes(state);
    for (let i = 1; i <= count; i++) {
      const districtId = count === 1 ? `${state}AL` : `${state}${String(i).padStart(2, '0')}`;
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
        const billId = bill.id || bill.billId || bill.number;
        if (billId) {
          entries.push({
            url: `${BASE_URL}/bill/${billId}`,
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

  const chambers = ['upper', 'lower'] as const;
  for (const state of STATES_ONLY) {
    const stateLower = state.toLowerCase();
    for (const chamber of chambers) {
      entries.push({
        url: `${BASE_URL}/state-districts/${stateLower}/${chamber}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  }

  return entries;
}

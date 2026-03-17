/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Offline script: Compute District Economic Vectors
 *
 * For each of 435 congressional districts:
 *   1. Query USASpending for federal spending by agency
 *   2. Map agencies to 13 IndustrySector categories
 *   3. Build a normalized 13-dimensional vector
 *   4. Compute pairwise cosine similarity (top 10 peers per district)
 *   5. Write to src/lib/mesh/district-vectors.json
 *
 * Usage: npx tsx scripts/compute-district-vectors.ts
 *
 * Rate limiting: USASpending has no strict rate limit but we add
 * small delays between requests to be respectful.
 */

/* eslint-disable no-console */

import { writeFileSync } from 'fs';
import { join } from 'path';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';
const OUTPUT_PATH = join(__dirname, '../src/lib/mesh/district-vectors.json');

// All 50 states + DC
const STATES = [
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
];

// Districts per state for 119th Congress (simplified — at-large states = 1)
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
};

// Agency name → sector index (0-12)
const AGENCY_SECTOR_INDEX: Record<string, number> = {
  'department of agriculture': 0, // Agribusiness
  'department of commerce': 1, // Communications/Electronics
  'department of housing and urban development': 2, // Construction
  'department of defense': 3, // Defense
  'department of veterans affairs': 3,
  'national aeronautics and space administration': 3,
  'department of energy': 4, // Energy
  'department of the interior': 4,
  'environmental protection agency': 4,
  'department of the treasury': 5, // Finance
  'department of health and human services': 6, // Health
  'department of justice': 7, // Lawyers & Lobbyists
  'department of transportation': 8, // Transportation
  'general services administration': 9, // Misc Business
  'small business administration': 9,
  'national science foundation': 1,
  'department of labor': 10, // Labor
  'department of education': 11, // Ideology/Single-Issue
};

interface DistrictVector {
  districtId: string;
  state: string;
  district: string;
  vector: number[];
  peers: Array<{ districtId: string; similarity: number }>;
}

async function fetchDistrictAgencies(
  state: string,
  district: string
): Promise<Map<string, number>> {
  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CIV.IQ/1.0 (District Vector Computation)',
    },
    body: JSON.stringify({
      subawards: false,
      limit: 100,
      fields: ['Award Amount', 'Awarding Agency'],
      sort: 'Award Amount',
      order: 'desc',
      filters: {
        place_of_performance_locations: [{ country: 'USA', state, district_current: district }],
        time_period: [{ start_date: startDate, end_date: endDate }],
        award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05'],
      },
    }),
  });

  if (!response.ok) return new Map();

  const data = await response.json();
  const agencies = new Map<string, number>();
  for (const result of data.results ?? []) {
    const agency = (result['Awarding Agency'] as string)?.toLowerCase();
    const amount = result['Award Amount'] as number;
    if (agency && amount > 0) {
      agencies.set(agency, (agencies.get(agency) ?? 0) + amount);
    }
  }
  return agencies;
}

function buildVector(agencies: Map<string, number>): number[] {
  const vector = new Array(13).fill(0) as number[];
  for (const [agency, amount] of agencies) {
    const idx = AGENCY_SECTOR_INDEX[agency];
    if (idx !== undefined) {
      vector[idx] += amount;
    } else {
      vector[12] += amount; // Other
    }
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i]! / magnitude;
    }
  }
  return vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
  }
  return dot; // Already normalized to unit vectors
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Computing district economic vectors...\n');

  const vectors: DistrictVector[] = [];
  let total = 0;

  for (const state of STATES) {
    const numDistricts = DISTRICTS_PER_STATE[state] ?? 1;
    for (let d = 1; d <= numDistricts; d++) {
      const district = d.toString().padStart(2, '0');
      const districtId = `${state}-${district}`;
      total++;

      try {
        const agencies = await fetchDistrictAgencies(state, district);
        const vector = buildVector(agencies);

        vectors.push({
          districtId,
          state,
          district,
          vector,
          peers: [], // Filled after all vectors computed
        });

        console.log(`[${total}/435] ${districtId}: ${agencies.size} agencies`);
      } catch (error) {
        console.error(`[${total}/435] ${districtId}: FAILED - ${error}`);
        vectors.push({
          districtId,
          state,
          district,
          vector: new Array(13).fill(0) as number[],
          peers: [],
        });
      }

      // Rate limiting: 200ms between requests
      await sleep(200);
    }
  }

  // Compute pairwise similarities and find top 10 peers
  console.log('\nComputing peer similarities...');
  for (let i = 0; i < vectors.length; i++) {
    const similarities: Array<{ districtId: string; similarity: number }> = [];

    for (let j = 0; j < vectors.length; j++) {
      if (i === j) continue;
      // Exclude same-state districts
      if (vectors[i]!.state === vectors[j]!.state) continue;

      const sim = cosineSimilarity(vectors[i]!.vector, vectors[j]!.vector);
      similarities.push({ districtId: vectors[j]!.districtId, similarity: sim });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    vectors[i]!.peers = similarities.slice(0, 10);
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(vectors, null, 0));
  const sizeKB = (Buffer.byteLength(JSON.stringify(vectors)) / 1024).toFixed(0);
  console.log(`\nWrote ${vectors.length} districts to ${OUTPUT_PATH} (${sizeKB}KB)`);
}

main().catch(console.error);

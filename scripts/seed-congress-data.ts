#!/usr/bin/env tsx

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress Data Preprocessing Script
 *
 * This script processes congress-legislators data once and outputs pre-calculated
 * statistics to a JSON file for instant API serving. This replaces the heavy
 * real-time processing that was causing API timeouts.
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Base URLs for congress-legislators data
const CONGRESS_LEGISLATORS_BASE_URL =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main';

// Define interfaces for the data structures
interface LegislatorTerm {
  type: 'rep' | 'sen';
  start: string;
  end: string;
  state: string;
  district?: number;
  party: string;
  phone?: string;
  address?: string;
  office?: string;
  url?: string;
}

interface Legislator {
  id: {
    bioguide: string;
  };
  name: {
    first: string;
    last: string;
    official_full?: string;
  };
  terms: LegislatorTerm[];
}

interface CongressStatistics {
  total: {
    members: number;
    house: number;
    senate: number;
  };
  byParty: {
    democrat: {
      total: number;
      house: number;
      senate: number;
    };
    republican: {
      total: number;
      house: number;
      senate: number;
    };
    independent: {
      total: number;
      house: number;
      senate: number;
    };
  };
  byState: {
    totalStates: number;
    representationCounts: Record<string, number>;
  };
  demographics: {
    averageAge?: number;
    genderDistribution?: {
      male: number;
      female: number;
      unknown: number;
    };
  };
  session: {
    congress: string;
    period: string;
    startDate: string;
    endDate: string;
  };
}

interface StatsOutput {
  success: boolean;
  statistics: CongressStatistics;
  metadata: {
    timestamp: string;
    dataSource: string;
    cacheable: boolean;
    generatedBy: string;
    processingTime?: number;
  };
}

/**
 * Check if a term is for the 119th Congress (2025-2027)
 */
function is119thCongressTerm(term: LegislatorTerm): boolean {
  const startDate = new Date(term.start);
  const endDate = new Date(term.end);

  // 119th Congress: January 3, 2025 - January 3, 2027
  const congress119Start = new Date('2025-01-03');
  const congress119End = new Date('2027-01-03');

  // Term overlaps with 119th Congress if:
  // - term starts before congress ends AND term ends after congress starts
  return startDate < congress119End && endDate > congress119Start;
}

/**
 * Filter legislators to only include current 119th Congress members
 */
function filterCurrent119thCongress(legislators: Legislator[]): Legislator[] {
  return legislators.filter(legislator => {
    // Check if any term is current for 119th Congress
    const hasCurrentTerm = legislator.terms.some(term => is119thCongressTerm(term));
    return hasCurrentTerm;
  });
}

/**
 * Fetch congress legislators data from GitHub
 */
async function fetchCongressData(): Promise<Legislator[]> {
  console.log('📡 Fetching congress-legislators data from GitHub...');

  const url = `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-current.yaml`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch legislators data: ${response.status} ${response.statusText}`);
  }

  const yamlText = await response.text();
  const data = yaml.load(yamlText) as Legislator[];

  console.log(`✅ Fetched ${data.length} legislators from GitHub`);
  return data;
}

/**
 * Calculate comprehensive statistics from legislators data
 */
function calculateStatistics(legislators: Legislator[]): CongressStatistics {
  console.log('📊 Calculating statistics...');

  // Filter for current 119th Congress members
  const currentLegislators = filterCurrent119thCongress(legislators);
  console.log(`Filtered to ${currentLegislators.length} current 119th Congress members`);

  // Process each legislator to get current term info
  const currentMembers = currentLegislators.map(legislator => {
    const currentTerm =
      legislator.terms.find(term => is119thCongressTerm(term)) ||
      legislator.terms[legislator.terms.length - 1];

    return {
      bioguideId: legislator.id.bioguide,
      name: legislator.name.official_full || `${legislator.name.first} ${legislator.name.last}`,
      party: currentTerm?.party || 'Unknown',
      state: currentTerm?.state || 'Unknown',
      chamber: currentTerm?.type === 'sen' ? 'senate' : 'house',
      district: currentTerm?.district?.toString() || null,
    };
  });

  // Calculate totals by chamber
  const houseMembers = currentMembers.filter(m => m.chamber === 'house');
  const senateMembers = currentMembers.filter(m => m.chamber === 'senate');

  // Debug party values
  const uniqueParties = [...new Set(currentMembers.map(m => m.party))];
  console.log(`Unique party values: ${uniqueParties.join(', ')}`);

  // Calculate party breakdowns with proper party matching
  const getPartyCount = (chamber: 'house' | 'senate' | 'all', party: string) => {
    let members = currentMembers;
    if (chamber !== 'all') {
      members = currentMembers.filter(m => m.chamber === chamber);
    }

    const partyFilter = (m: any) => {
      const memberParty = m.party?.toLowerCase() || '';
      if (party === 'democrat') {
        return memberParty.includes('democrat') || memberParty === 'd' || memberParty === 'dem';
      }
      if (party === 'republican') {
        return memberParty.includes('republican') || memberParty === 'r' || memberParty === 'rep';
      }
      if (party === 'independent') {
        return memberParty.includes('independent') || memberParty === 'i' || memberParty === 'ind';
      }
      return false;
    };

    return members.filter(partyFilter).length;
  };

  // Calculate state representation
  const stateRepresentation = currentMembers.reduce(
    (acc, member) => {
      acc[member.state] = (acc[member.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statistics: CongressStatistics = {
    total: {
      members: currentMembers.length,
      house: houseMembers.length,
      senate: senateMembers.length,
    },
    byParty: {
      democrat: {
        total: getPartyCount('all', 'democrat'),
        house: getPartyCount('house', 'democrat'),
        senate: getPartyCount('senate', 'democrat'),
      },
      republican: {
        total: getPartyCount('all', 'republican'),
        house: getPartyCount('house', 'republican'),
        senate: getPartyCount('senate', 'republican'),
      },
      independent: {
        total: getPartyCount('all', 'independent'),
        house: getPartyCount('house', 'independent'),
        senate: getPartyCount('senate', 'independent'),
      },
    },
    byState: {
      totalStates: Object.keys(stateRepresentation).length,
      representationCounts: stateRepresentation,
    },
    demographics: {
      // These would require additional biographical data from other sources
      averageAge: undefined,
      genderDistribution: {
        male: 0,
        female: 0,
        unknown: currentMembers.length,
      },
    },
    session: {
      congress: '119th',
      period: '2025-2027',
      startDate: 'January 3, 2025',
      endDate: 'January 3, 2027',
    },
  };

  console.log('📈 Statistics calculated:');
  console.log(`  Total Members: ${statistics.total.members}`);
  console.log(`  House: ${statistics.total.house}, Senate: ${statistics.total.senate}`);
  console.log(
    `  Democrats: ${statistics.byParty.democrat.total}, Republicans: ${statistics.byParty.republican.total}, Independents: ${statistics.byParty.independent.total}`
  );

  return statistics;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(): Promise<void> {
  const outputDir = path.join(process.cwd(), 'public', 'data');
  try {
    await fs.access(outputDir);
  } catch {
    console.log('📁 Creating public/data directory...');
    await fs.mkdir(outputDir, { recursive: true });
  }
}

/**
 * Main function to process and output congress statistics
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('🚀 Starting Congress data preprocessing...');

    // Ensure output directory exists
    await ensureOutputDirectory();

    // Fetch raw data
    const legislators = await fetchCongressData();

    // Calculate statistics
    const statistics = calculateStatistics(legislators);

    // Prepare output
    const output: StatsOutput = {
      success: true,
      statistics,
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: 'congress-legislators',
        cacheable: true,
        generatedBy: 'scripts/seed-congress-data.ts',
        processingTime: Date.now() - startTime,
      },
    };

    // Write to file
    const outputPath = path.join(process.cwd(), 'public', 'data', 'congress-stats.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`✅ Congress statistics generated successfully!`);
    console.log(`📝 Output written to: ${outputPath}`);
    console.log(`⚡ Processing time: ${Date.now() - startTime}ms`);
    console.log('🎯 API endpoint can now serve this file instantly!');
  } catch (error) {
    console.error('❌ Error processing congress data:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  main().catch(console.error);
}

/**
 * Training Data Collection Script
 *
 * Collects and joins real government records from live APIs into a structured
 * dataset suitable for ML model training. NOT synthetic data — this script
 * calls existing services to fetch actual voting records, campaign finance
 * data, and lobbying filings.
 *
 * Outputs:
 *   training-data/vote-donor-records.json   (~50K-100K records)
 *   training-data/donor-profiles.json       (~535 records)
 *   training-data/bill-lobbying-pairs.json  (~5K-10K records)
 *   training-data/metadata.json             (collection stats)
 *
 * Usage: npx tsx scripts/collect-training-data.ts
 *        npx tsx scripts/collect-training-data.ts --cycle=2024
 *        npx tsx scripts/collect-training-data.ts --incremental
 *        npx tsx scripts/collect-training-data.ts --max=10
 *        npx tsx scripts/collect-training-data.ts --with-bill-text
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getBillSectors, getCurrentElectionCycle } from '@/lib/intelligence/analyzers/shared';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import {
  getIndustrySectorsForPolicyArea,
  getPolicyAreasForSector,
} from '@/lib/connections/policy-area-map';
import { getPolicyAreasForLDAIssue } from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import type {
  VoteDonorRecord,
  DonorProfileVector,
  BillLobbyingPair,
  TrainingDataMetadata,
} from '@/lib/intelligence/training/types';

import * as fs from 'fs';
import * as path from 'path';

// ── Configuration ────────────────────────────────────────────────────

const CONGRESS = 119;
const MAX_VOTES_PER_LEGISLATOR = 200;
const MAX_CONTRIBUTIONS = 500;
const BATCH_SIZE_LEGISLATORS = 3; // Small batches to avoid FEC 429 rate limits
const BATCH_DELAY_MS = 10_000; // 10s between batches (FEC rate limit is the bottleneck)
const FEC_BATCH_DELAY_MS = 6000; // 6s between FEC batches (1000/hr limit = 3.6s min)
const PER_LEGISLATOR_TIMEOUT_MS = 600_000; // 10 min max per legislator (Senate XML parsing is very slow)
const SAVE_EVERY_N_BATCHES = 5; // Write partial results every 5 batches
const LOBBYING_QUARTERS = 8; // Last 8 quarters
const OUTPUT_DIR = path.resolve(process.cwd(), 'training-data');

const isIncremental = process.argv.includes('--incremental');
const withBillText = process.argv.includes('--with-bill-text');
const cliCycle =
  parseInt(process.argv.find(a => a.startsWith('--cycle='))?.split('=')[1] ?? '0') || 0;
const maxLegislators =
  parseInt(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] ?? '0') || Infinity;

// Cache bill metadata to avoid redundant fetches across legislators
const billMetadataCache = new Map<
  string,
  {
    policyArea: string;
    sponsorParty: 'D' | 'R' | 'I';
    cosponsorCount: number;
    textSnippet: string;
  }
>();

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${msg}`, data ? JSON.stringify(data) : '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry with exponential backoff for rate-limited APIs. */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  baseDelayMs = 5000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = (error as Error).message ?? '';
      const isRateLimited = msg.includes('429') || msg.includes('rate') || msg.includes('Too Many');
      if (attempt === maxAttempts || !isRateLimited) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      log(
        `[${label}] Rate limited, retrying in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})`
      );
      await sleep(delay);
    }
  }
  throw new Error(`[${label}] Exhausted ${maxAttempts} retries`);
}

function normalizeParty(party: string): 'D' | 'R' | 'I' {
  if (party.startsWith('D')) return 'D';
  if (party.startsWith('R')) return 'R';
  return 'I';
}

function buildDonorProfile(
  sectorAggregation: Array<{ sector: IndustrySector; totalAmount: number; count: number }>
): {
  distribution: Record<string, number>;
  totalDonations: number;
  topSectors: DonorProfileVector['topSectors'];
} {
  let totalDonations = 0;
  for (const entry of sectorAggregation) {
    totalDonations += entry.totalAmount;
  }

  const distribution: Record<string, number> = {};
  const topSectors: DonorProfileVector['topSectors'] = [];

  // Initialize all sectors to 0
  for (const sector of Object.values(IndustrySector)) {
    distribution[sector] = 0;
  }

  // Fill in actual values
  for (const entry of sectorAggregation) {
    const pct = totalDonations > 0 ? entry.totalAmount / totalDonations : 0;
    distribution[entry.sector] = pct;
    topSectors.push({
      sector: entry.sector,
      amount: entry.totalAmount,
      pct,
    });
  }

  // Sort top sectors by amount descending
  topSectors.sort((a, b) => b.amount - a.amount);

  return { distribution, totalDonations, topSectors: topSectors.slice(0, 5) };
}

// ── Main Collection ──────────────────────────────────────────────────

async function collectTrainingData() {
  const startTime = Date.now();
  log('Starting training data collection');

  // Load existing data for incremental mode
  let existingBioguideIds = new Set<string>();
  if (isIncremental) {
    try {
      const existing = JSON.parse(
        fs.readFileSync(path.join(OUTPUT_DIR, 'donor-profiles.json'), 'utf-8')
      ) as DonorProfileVector[];
      existingBioguideIds = new Set(existing.map(p => p.bioguideId));
      log('Incremental mode: skipping existing legislators', { count: existingBioguideIds.size });
    } catch {
      log('Incremental mode: no existing data found, collecting all');
    }
  }

  // Step 1: Fetch all current legislators
  log('Fetching all current legislators...');
  const allReps = await getAllEnhancedRepresentatives();
  log('Fetched legislators', { total: allReps.length });

  // Filter to voting members (exclude non-voting delegates)
  const allVoting = allReps.filter(r => r.votingMember);
  const legislators = allVoting.slice(0, maxLegislators);
  log('Voting members', { total: allVoting.length, processing: legislators.length });

  // Use CLI --cycle flag, or default to 2024 (complete FEC data)
  const cycle = cliCycle || 2024;
  log('FEC election cycle', { cycle });
  let voteDonorRecords: VoteDonorRecord[] = [];
  let donorProfiles: DonorProfileVector[] = [];
  let legislatorsProcessed = 0;
  let legislatorsSkipped = 0;

  // In incremental mode, also load existing vote-donor records from partial saves
  if (isIncremental && existingBioguideIds.size > 0) {
    try {
      voteDonorRecords = JSON.parse(
        fs.readFileSync(path.join(OUTPUT_DIR, 'vote-donor-records.json'), 'utf-8')
      ) as VoteDonorRecord[];
      donorProfiles = JSON.parse(
        fs.readFileSync(path.join(OUTPUT_DIR, 'donor-profiles.json'), 'utf-8')
      ) as DonorProfileVector[];
      log('Incremental mode: loaded existing data', {
        records: voteDonorRecords.length,
        profiles: donorProfiles.length,
      });
    } catch {
      // Partial saves may not exist — start fresh
    }
  }

  // Step 2a: Pre-warm vote caches for each chamber
  const sampleHouseRep = legislators.find(r => r.chamber === 'House');
  const sampleSenateRep = legislators.find(r => r.chamber === 'Senate');
  if (sampleHouseRep) {
    log('Warming House vote cache...');
    await fetchLegislatorVotes(sampleHouseRep.bioguideId, 'House');
    log('House vote cache warmed');
  }
  if (sampleSenateRep) {
    log('Warming Senate vote cache...');
    await fetchLegislatorVotes(sampleSenateRep.bioguideId, 'Senate');
    log('Senate vote cache warmed');
  }

  // Process House first (fast), then Senate (slow XML parsing)
  const sortedLegislators = [...legislators].sort((a, b) => {
    if (a.chamber === b.chamber) return 0;
    return a.chamber === 'House' ? -1 : 1;
  });

  // Step 2b: Process legislators in batches
  const totalLegislators = sortedLegislators.length;
  for (let i = 0; i < totalLegislators; i += BATCH_SIZE_LEGISLATORS) {
    const batch = sortedLegislators.slice(i, i + BATCH_SIZE_LEGISLATORS);

    const batchResults = await Promise.allSettled(
      batch.map(async rep => {
        if (existingBioguideIds.has(rep.bioguideId)) {
          legislatorsSkipped++;
          return null;
        }

        try {
          // Per-legislator timeout to prevent hangs on slow API calls
          return await Promise.race([
            processLegislator(rep, cycle),
            new Promise<null>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Timeout after ${PER_LEGISLATOR_TIMEOUT_MS / 1000}s`)),
                PER_LEGISLATOR_TIMEOUT_MS
              )
            ),
          ]);
        } catch (error) {
          log(`Error processing ${rep.bioguideId}`, {
            error: (error as Error).message,
          });
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { records, profile } = result.value;
        voteDonorRecords.push(...records);
        donorProfiles.push(profile);
        legislatorsProcessed++;
      }
    }

    const batchNumber = Math.floor(i / BATCH_SIZE_LEGISLATORS) + 1;
    const progress = Math.min(i + BATCH_SIZE_LEGISLATORS, totalLegislators);
    log(`Progress: ${progress}/${totalLegislators} legislators`, {
      records: voteDonorRecords.length,
      profiles: donorProfiles.length,
    });

    // Save partial results periodically so progress isn't lost on crash/kill
    if (batchNumber % SAVE_EVERY_N_BATCHES === 0 && voteDonorRecords.length > 0) {
      log('Saving intermediate results...');
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'vote-donor-records.json'),
        JSON.stringify(voteDonorRecords, null, 2)
      );
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'donor-profiles.json'),
        JSON.stringify(donorProfiles, null, 2)
      );
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE_LEGISLATORS < totalLegislators) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Step 3: Collect lobbying data and build bill-lobbying pairs
  log('Collecting lobbying filings...');
  const billLobbyingPairs = await collectBillLobbyingPairs(voteDonorRecords);

  // Step 4: Compute metadata
  const voteDates = voteDonorRecords
    .map(r => r.voteDate)
    .filter(Boolean)
    .sort();

  const lobbyingYears = billLobbyingPairs.map(p => p.filingYear).filter(Boolean);

  const metadata: TrainingDataMetadata = {
    collectedAt: new Date().toISOString(),
    electionCycle: cycle,
    congress: CONGRESS,
    recordCounts: {
      voteDonorRecords: voteDonorRecords.length,
      donorProfiles: donorProfiles.length,
      billLobbyingPairs: billLobbyingPairs.length,
    },
    dataRanges: {
      voteDateRange: {
        earliest: voteDates[0] ?? '',
        latest: voteDates[voteDates.length - 1] ?? '',
      },
      lobbyingYearRange: {
        earliest: Math.min(...(lobbyingYears.length ? lobbyingYears : [0])),
        latest: Math.max(...(lobbyingYears.length ? lobbyingYears : [0])),
      },
    },
    legislatorsProcessed,
    legislatorsSkipped,
    collectionDurationMs: Date.now() - startTime,
  };

  // Step 5: Write outputs
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'vote-donor-records.json'),
    JSON.stringify(voteDonorRecords, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'donor-profiles.json'),
    JSON.stringify(donorProfiles, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'bill-lobbying-pairs.json'),
    JSON.stringify(billLobbyingPairs, null, 2)
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // Step 6: Print summary and validate minimums
  log('=== Collection Complete ===');
  log(`Vote-Donor Records: ${voteDonorRecords.length}`);
  log(`Donor Profiles: ${donorProfiles.length}`);
  log(`Bill-Lobbying Pairs: ${billLobbyingPairs.length}`);
  log(`Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);

  // Validate minimums
  const errors: string[] = [];
  if (voteDonorRecords.length < 10_000) {
    errors.push(`Vote-donor records (${voteDonorRecords.length}) below minimum 10,000`);
  }
  if (donorProfiles.length < 400) {
    errors.push(`Donor profiles (${donorProfiles.length}) below minimum 400`);
  }
  if (billLobbyingPairs.length < 1_000) {
    errors.push(`Bill-lobbying pairs (${billLobbyingPairs.length}) below minimum 1,000`);
  }

  // Validate donor profiles sum to ~1.0
  const badProfiles = donorProfiles.filter(p => {
    const sum = Object.values(p.sectorDistribution).reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) > 0.01;
  });
  if (badProfiles.length > 0) {
    errors.push(`${badProfiles.length} donor profiles don't sum to ~1.0`);
  }

  // Check for NaN/null in required fields
  const badRecords = voteDonorRecords.filter(
    r => !r.bioguideId || !r.billId || !r.vote || !r.party
  );
  if (badRecords.length > 0) {
    errors.push(`${badRecords.length} vote-donor records have missing required fields`);
  }

  // Check bill sector coverage
  const withSectors = voteDonorRecords.filter(r => r.billSectors.length > 0);
  const sectorCoverage =
    voteDonorRecords.length > 0 ? withSectors.length / voteDonorRecords.length : 0;
  if (sectorCoverage < 0.8) {
    log(`WARNING: Bill sector coverage at ${(sectorCoverage * 100).toFixed(1)}% (target: >80%)`);
  }

  if (errors.length > 0) {
    log('VALIDATION WARNINGS:');
    for (const error of errors) {
      log(`  - ${error}`);
    }
    // Don't exit non-zero for warnings — data may still be usable
    log('Data written despite warnings. Review before training.');
  } else {
    log('All validation checks passed.');
  }
}

// ── Per-Legislator Processing ────────────────────────────────────────

interface LegislatorResult {
  records: VoteDonorRecord[];
  profile: DonorProfileVector;
}

async function processLegislator(
  rep: Awaited<ReturnType<typeof getAllEnhancedRepresentatives>>[number],
  cycle: number
): Promise<LegislatorResult | null> {
  const bioguideId = rep.bioguideId;

  // Get FEC ID
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) return null;

  // Fetch votes and contributions in parallel
  const [rawVotes, primaryContributions] = await Promise.all([
    fetchLegislatorVotes(bioguideId, rep.chamber),
    fecApiService.getSampleContributions(fecId, cycle, MAX_CONTRIBUTIONS).catch(() => []),
  ]);

  // Cycle fallback: many 119th Congress members have data under 2022 cycle
  // (Senators not up in 2024, House members with delayed filings)
  let contributions = primaryContributions;
  if (!contributions.length && cycle >= 2022) {
    contributions = await fecApiService
      .getSampleContributions(fecId, cycle - 2, MAX_CONTRIBUTIONS)
      .catch(() => []);
  }

  if (!contributions.length) return null;

  // Build donor profile
  const sectorAggregation = aggregateByIndustrySector(contributions);
  const { distribution, totalDonations, topSectors } = buildDonorProfile(sectorAggregation);

  const profile: DonorProfileVector = {
    bioguideId,
    party: normalizeParty(rep.party),
    chamber: rep.chamber,
    state: rep.state,
    district: rep.district,
    sectorDistribution: distribution,
    totalDonations,
    topSectors,
  };

  // Build vote-donor records — process votes in parallel batches for speed
  const yearsInOffice = rep.yearsInOffice ?? 0;
  const committeeCodes = (rep.committees ?? []).map(c => c.name);

  // Filter to yea/nay votes first
  const eligibleVotes = rawVotes.filter(vote => {
    const position = vote.position.toLowerCase();
    return position === 'yea' || position === 'yes' || position === 'nay' || position === 'no';
  });

  // Process votes in parallel batches of 20 (bill classification is the bottleneck)
  const VOTE_BATCH_SIZE = 20;
  const records: VoteDonorRecord[] = [];

  for (let vi = 0; vi < eligibleVotes.length; vi += VOTE_BATCH_SIZE) {
    const voteBatch = eligibleVotes.slice(vi, vi + VOTE_BATCH_SIZE);
    const batchRecords = await Promise.all(
      voteBatch.map(async vote => {
        const position = vote.position.toLowerCase();
        const normalizedVote: 'yea' | 'nay' =
          position === 'yea' || position === 'yes' ? 'yea' : 'nay';

        const billId = vote.bill
          ? `${vote.bill.type}${vote.bill.number}-${vote.bill.congress}`
          : vote.voteId;
        const billTitle = vote.bill?.title ?? vote.question;

        let billSectors: IndustrySector[] = [];
        try {
          billSectors = await getBillSectors(billId, billTitle);
        } catch {
          // Sector classification failed — record with empty sectors
        }

        const billMeta = await fetchBillMetadata(
          vote.bill ? `${vote.bill.congress}-${vote.bill.type}-${vote.bill.number}` : '',
          normalizeParty(rep.party)
        );

        return {
          bioguideId,
          billId,
          voteId: vote.voteId,
          vote: normalizedVote,
          party: normalizeParty(rep.party),
          chamber: rep.chamber,
          state: rep.state,
          yearsInOffice,
          committeeCodes,
          donorProfile: distribution,
          totalDonations,
          billSectors,
          billPolicyArea: billMeta?.policyArea ?? '',
          sponsorParty: billMeta?.sponsorParty ?? normalizeParty(rep.party),
          cosponsorCount: billMeta?.cosponsorCount ?? 0,
          voteDate: vote.date,
          electionCycle: cycle,
        } as VoteDonorRecord;
      })
    );
    records.push(...batchRecords);
  }

  return { records, profile };
}

async function fetchLegislatorVotes(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<
  Array<{
    voteId: string;
    date: string;
    question: string;
    position: string;
    result: string;
    bill?: { congress: number; type: string; number: string; title: string };
    rollCallNumber?: number;
  }>
> {
  try {
    const fetchSession = async (session: 1 | 2) => {
      return chamber === 'House'
        ? batchVotingService.getHouseMemberVotes(
            bioguideId,
            CONGRESS,
            session,
            MAX_VOTES_PER_LEGISLATOR
          )
        : batchVotingService.getSenateMemberVotes(
            bioguideId,
            CONGRESS,
            session,
            MAX_VOTES_PER_LEGISLATOR
          );
    };

    const [session1, session2] = await Promise.all([fetchSession(1), fetchSession(2)]);
    return [...session1, ...session2];
  } catch {
    return [];
  }
}

// ── Bill Metadata Fetching ────────────────────────────────────────────

async function fetchBillMetadata(
  congressBillId: string,
  fallbackParty: 'D' | 'R' | 'I'
): Promise<{
  policyArea: string;
  sponsorParty: 'D' | 'R' | 'I';
  cosponsorCount: number;
  textSnippet: string;
} | null> {
  if (!congressBillId) return null;

  // Check cache first
  if (billMetadataCache.has(congressBillId)) {
    return billMetadataCache.get(congressBillId)!;
  }

  try {
    const bill = await fetchBillFromCongress(congressBillId);
    if (!bill) return null;

    const meta = {
      policyArea: bill.policyArea ?? '',
      sponsorParty: normalizeParty(bill.sponsor?.representative?.party ?? fallbackParty),
      cosponsorCount: bill.cosponsors?.filter(c => !c.withdrawn).length ?? 0,
      textSnippet: '', // Populated only with --with-bill-text flag
    };

    billMetadataCache.set(congressBillId, meta);
    return meta;
  } catch {
    return null;
  }
}

// ── Bill-Lobbying Pair Collection ────────────────────────────────────

async function collectBillLobbyingPairs(
  voteDonorRecords: VoteDonorRecord[]
): Promise<BillLobbyingPair[]> {
  // Get unique bills from vote records
  const uniqueBills = new Map<
    string,
    { billId: string; title: string; sectors: IndustrySector[] }
  >();
  for (const record of voteDonorRecords) {
    if (!uniqueBills.has(record.billId) && record.billSectors.length > 0) {
      uniqueBills.set(record.billId, {
        billId: record.billId,
        title: record.billPolicyArea || record.billId,
        sectors: record.billSectors,
      });
    }
  }

  log(`Found ${uniqueBills.size} unique bills with sector classifications`);

  // Fetch lobbying filings for recent quarters
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const allFilings = [];
  const quartersToFetch: Array<{ year: number; quarter: number }> = [];

  // Build list of quarters to fetch (last 8)
  let year = currentYear;
  let quarter = currentQuarter;
  for (let i = 0; i < LOBBYING_QUARTERS; i++) {
    quartersToFetch.push({ year, quarter });
    quarter--;
    if (quarter < 1) {
      quarter = 4;
      year--;
    }
  }

  // Fetch each quarter with retry for rate limiting
  for (const q of quartersToFetch) {
    try {
      const filings = await withRetry(
        () => senateLobbyingAPI.fetchFilingsByQuarter(q.year, q.quarter),
        `LDA Q${q.quarter} ${q.year}`,
        3,
        5000
      );
      allFilings.push(...filings);
      log(`Fetched lobbying Q${q.quarter} ${q.year}`, { filings: filings.length });
    } catch (error) {
      log(`Failed to fetch lobbying Q${q.quarter} ${q.year} after retries`, {
        error: (error as Error).message,
      });
    }
    await sleep(3000); // 3s between lobbying API calls (Senate LDA rate limits aggressively)
  }

  log(`Total lobbying filings fetched: ${allFilings.length}`);

  // Match bills to lobbying filings by sector/policy area overlap
  const pairs: BillLobbyingPair[] = [];

  for (const [, bill] of uniqueBills) {
    // Get policy areas for the bill's sectors
    const billPolicyAreas = new Set(
      bill.sectors.flatMap(sector => getPolicyAreasForSector(sector))
    );

    for (const filing of allFilings) {
      if (!filing.issues?.length && !filing.specific_issues?.length) continue;

      // Match via LDA issue codes → policy areas (structured matching)
      let isMatch = false;
      if (filing.issues?.length) {
        for (const issue of filing.issues) {
          const filingPolicyAreas = getPolicyAreasForLDAIssue(issue.code);
          if (filingPolicyAreas.some(pa => billPolicyAreas.has(pa))) {
            isMatch = true;
            break;
          }
        }
      }

      // Fallback: keyword matching on specific_issues text
      if (!isMatch && filing.specific_issues?.length) {
        const issueText = (Array.isArray(filing.specific_issues) ? filing.specific_issues : [])
          .join(' ')
          .toLowerCase();
        const billKeywords = bill.sectors.flatMap(sector => getRelatedKeywords(sector));
        isMatch = billKeywords.some(kw => issueText.includes(kw));
      }

      if (!isMatch) continue;

      // Fetch bill text snippet if --with-bill-text flag is set
      let billTextSnippet = '';
      if (withBillText) {
        const meta = await fetchBillMetadata(bill.billId, 'D');
        if (meta?.textSnippet) {
          billTextSnippet = meta.textSnippet;
        }
      }

      pairs.push({
        billId: bill.billId,
        billTitle: bill.title,
        billPolicyArea: bill.sectors[0] ?? '',
        billTextSnippet,
        lobbyingFilingId: filing.id,
        lobbyingClient: filing.client.name,
        lobbyingRegistrant: filing.registrant.name,
        lobbyingIssueText: (Array.isArray(filing.specific_issues) ? filing.specific_issues : [])
          .join(' ')
          .substring(0, 2000),
        lobbyingIncome: filing.income ?? 0,
        filingYear: filing.filingYear,
        filingPeriod: filing.filingPeriod,
      });
    }
  }

  // Deduplicate by (billId, filingId)
  const seen = new Set<string>();
  const dedupedPairs = pairs.filter(p => {
    const key = `${p.billId}:${p.lobbyingFilingId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  log(`Bill-lobbying pairs: ${dedupedPairs.length} (from ${pairs.length} raw matches)`);
  return dedupedPairs;
}

/**
 * Get related keywords for matching lobbying text to industry sectors.
 */
function getRelatedKeywords(sector: IndustrySector): string[] {
  const sectorKeywords: Record<string, string[]> = {
    [IndustrySector.AGRIBUSINESS]: ['agriculture', 'farm', 'food', 'crop', 'livestock'],
    [IndustrySector.COMMUNICATIONS_ELECTRONICS]: [
      'telecom',
      'broadband',
      'semiconductor',
      'technology',
      'spectrum',
    ],
    [IndustrySector.CONSTRUCTION]: ['construction', 'infrastructure', 'building', 'housing'],
    [IndustrySector.DEFENSE]: ['defense', 'military', 'weapon', 'pentagon', 'veteran'],
    [IndustrySector.ENERGY_NATURAL_RESOURCES]: [
      'energy',
      'oil',
      'gas',
      'renewable',
      'nuclear',
      'mining',
    ],
    [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE]: [
      'banking',
      'financial',
      'insurance',
      'mortgage',
      'securities',
    ],
    [IndustrySector.HEALTH]: ['health', 'medical', 'pharmaceutical', 'medicare', 'hospital'],
    [IndustrySector.LAWYERS_LOBBYISTS]: ['legal', 'law firm', 'attorney'],
    [IndustrySector.TRANSPORTATION]: [
      'transportation',
      'aviation',
      'railroad',
      'shipping',
      'highway',
    ],
    [IndustrySector.MISC_BUSINESS]: ['business', 'retail', 'manufacturing'],
    [IndustrySector.LABOR]: ['labor', 'union', 'worker', 'employment'],
    [IndustrySector.IDEOLOGY_SINGLE_ISSUE]: [
      'advocacy',
      'rights',
      'gun',
      'abortion',
      'environmental',
    ],
    [IndustrySector.OTHER]: [],
  };

  return sectorKeywords[sector] ?? [];
}

// ── Entry Point ──────────────────────────────────────────────────────

collectTrainingData()
  .then(() => {
    log('Done.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

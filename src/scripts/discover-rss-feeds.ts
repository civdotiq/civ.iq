#!/usr/bin/env tsx

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * RSS Feed Discovery Script (Optimized)
 *
 * This script automatically discovers RSS feeds for all members of Congress
 * by testing high-probability candidate URLs and generating a comprehensive
 * RSS feed mapping file for the aggregator.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Parallel processing of representatives in batches
 * - Concurrent URL testing within each representative
 * - Smart rate limiting with batch delays instead of per-URL delays
 * - Real-time progress tracking with ETA
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '@/lib/logging/simple-logger';
import * as cliProgress from 'cli-progress';

interface CongressMember {
  id: {
    bioguide: string;
  };
  name: {
    first: string;
    last: string;
    official_full?: string;
  };
  terms: Array<{
    type: 'rep' | 'sen';
    start: string;
    end: string;
    state: string;
    district?: number;
    party: string;
    url?: string;
  }>;
}

interface FeedCandidate {
  url: string;
  type: 'official' | 'news_search';
  priority: number;
}

interface RSSFeedMap {
  [bioguideId: string]: {
    name: string;
    feeds: string[];
  };
}

interface DiscoveryResult {
  bioguideId: string;
  name: string;
  chamber: 'house' | 'senate';
  state: string;
  candidatesFound: number;
  validFeeds: string[];
  errors: string[];
}

const USER_AGENT = 'CivicIntelligenceHub/1.0 (civic data aggregation)';
const BATCH_SIZE = 20; // Process 20 representatives at once
const BATCH_DELAY_MS = 500; // Wait 500ms between batches
const REQUEST_TIMEOUT_MS = 8000; // Reduced from 10s to 8s for faster fails

function getCurrentTermInfo(member: CongressMember): {
  chamber: 'house' | 'senate';
  state: string;
  district?: number;
  officialUrl?: string;
} | null {
  // Find the most recent term that hasn't ended
  const now = new Date();
  const currentTerm = member.terms
    .filter(term => new Date(term.end) > now)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())[0];

  if (!currentTerm) return null;

  return {
    chamber: currentTerm.type === 'rep' ? 'house' : 'senate',
    state: currentTerm.state,
    district: currentTerm.district,
    officialUrl: currentTerm.url,
  };
}

function generateFeedCandidates(
  member: CongressMember,
  termInfo: { chamber: 'house' | 'senate'; state: string; district?: number; officialUrl?: string }
): FeedCandidate[] {
  const candidates: FeedCandidate[] = [];
  const firstName = member.name.first.toLowerCase();
  const lastName = member.name.last.toLowerCase();
  const fullName = member.name.official_full || `${member.name.first} ${member.name.last}`;

  // Generate official website feed candidates
  if (termInfo.chamber === 'house') {
    // House.gov patterns
    const houseBaseUrls = [
      `https://${lastName}.house.gov`,
      `https://${firstName}${lastName}.house.gov`,
      `https://${firstName}-${lastName}.house.gov`,
      `https://rep${lastName}.house.gov`,
      `https://representative${lastName}.house.gov`,
    ];

    for (const baseUrl of houseBaseUrls) {
      candidates.push(
        { url: `${baseUrl}/news/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/press-releases/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/media/rss.xml`, type: 'official', priority: 1 },
        { url: `${baseUrl}/rss.xml`, type: 'official', priority: 1 },
        { url: `${baseUrl}/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/newsroom/feed`, type: 'official', priority: 2 }
      );
    }
  } else {
    // Senate.gov patterns
    const senateBaseUrls = [
      `https://www.${lastName}.senate.gov`,
      `https://${lastName}.senate.gov`,
      `https://www.${firstName}${lastName}.senate.gov`,
    ];

    for (const baseUrl of senateBaseUrls) {
      candidates.push(
        { url: `${baseUrl}/news/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/newsroom/press-releases/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/press-releases/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/media/rss.xml`, type: 'official', priority: 1 },
        { url: `${baseUrl}/rss.xml`, type: 'official', priority: 1 },
        { url: `${baseUrl}/feed`, type: 'official', priority: 1 },
        { url: `${baseUrl}/newsroom/feed`, type: 'official', priority: 2 }
      );
    }
  }

  // Google News search feeds (fallback)
  const chamberTitle = termInfo.chamber === 'house' ? 'congressman' : 'senator';
  candidates.push(
    {
      url: `https://news.google.com/rss/search?q="${fullName}"`,
      type: 'news_search',
      priority: 3,
    },
    {
      url: `https://news.google.com/rss/search?q="${fullName}" ${chamberTitle}`,
      type: 'news_search',
      priority: 3,
    }
  );

  // Sort by priority (lower number = higher priority)
  return candidates.sort((a, b) => a.priority - b.priority);
}

async function testFeedUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status !== 200) {
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    const isXML =
      contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');

    return isXML;
  } catch {
    return false;
  }
}

async function discoverFeedsForMember(member: CongressMember): Promise<DiscoveryResult> {
  const termInfo = getCurrentTermInfo(member);
  const fullName = member.name.official_full || `${member.name.first} ${member.name.last}`;

  const result: DiscoveryResult = {
    bioguideId: member.id.bioguide,
    name: fullName,
    chamber: termInfo?.chamber || 'house',
    state: termInfo?.state || 'Unknown',
    candidatesFound: 0,
    validFeeds: [],
    errors: [],
  };

  if (!termInfo) {
    result.errors.push('No current term found');
    return result;
  }

  const candidates = generateFeedCandidates(member, termInfo);
  result.candidatesFound = candidates.length;

  // Test candidates in parallel, but limit to avoid overwhelming servers
  const maxOfficialFeeds = 2;
  const maxNewsFeeds = 1;
  let officialFeedsFound = 0;
  let newsFeedsFound = 0;

  // Filter candidates based on limits and test them in parallel
  const candidatesToTest = candidates.filter(candidate => {
    if (candidate.type === 'official' && officialFeedsFound >= maxOfficialFeeds) {
      return false;
    }
    if (candidate.type === 'news_search' && newsFeedsFound >= maxNewsFeeds) {
      return false;
    }
    return true;
  });

  // Use Promise.allSettled to test all candidates in parallel
  const testPromises = candidatesToTest.map(async candidate => {
    try {
      const isValid = await testFeedUrl(candidate.url);
      return { candidate, isValid, error: null };
    } catch (error) {
      return { candidate, isValid: false, error: (error as Error).message };
    }
  });

  const testResults = await Promise.allSettled(testPromises);

  // Process results
  for (const settlementResult of testResults) {
    if (settlementResult.status === 'fulfilled') {
      const { candidate, isValid, error } = settlementResult.value;

      if (error) {
        result.errors.push(`${candidate.url}: ${error}`);
      } else if (isValid) {
        result.validFeeds.push(candidate.url);
        if (candidate.type === 'official') {
          officialFeedsFound++;
        } else {
          newsFeedsFound++;
        }
      }
    } else {
      result.errors.push(`Unexpected error during testing: ${settlementResult.reason}`);
    }
  }

  // If no official feeds found, include Google News search as fallback
  if (result.validFeeds.length === 0) {
    result.validFeeds.push(`https://news.google.com/rss/search?q="${fullName}"`);
    result.errors.push('No official feeds found, using Google News fallback');
  }

  return result;
}

async function loadCongressData(): Promise<CongressMember[]> {
  const cacheFile = '.next/cache/congress-data/congress-legislators-current.json';
  const cachePath = path.resolve(cacheFile);

  try {
    const data = await fs.readFile(cachePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.data || parsed; // Handle different cache formats
  } catch {
    logger.error('Failed to load cached congress data, fetching fresh data...');

    // Fallback: fetch fresh data
    const response = await fetch(
      'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.json'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch congress data: ${response.statusText}`);
    }

    return await response.json();
  }
}

async function processBatch(
  batch: CongressMember[],
  progressBar: cliProgress.SingleBar
): Promise<DiscoveryResult[]> {
  // Process all members in the batch concurrently
  const batchPromises = batch.map(member => discoverFeedsForMember(member));
  const results = await Promise.allSettled(batchPromises);

  const processedResults: DiscoveryResult[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      processedResults.push(result.value);
    } else {
      // Create error result for failed member
      processedResults.push({
        bioguideId: 'UNKNOWN',
        name: 'Failed to process',
        chamber: 'house',
        state: 'Unknown',
        candidatesFound: 0,
        validFeeds: [],
        errors: [`Batch processing error: ${result.reason}`],
      });
    }

    // Update progress bar for each completed member
    progressBar.increment();
  }

  return processedResults;
}

async function generateRSSFeedMap(): Promise<void> {
  logger.info('🔍 Starting optimized RSS feed discovery for all members of Congress...');

  const members = await loadCongressData();
  const total = members.length;
  logger.info(`📊 Loaded ${total} members of Congress`);
  logger.info(`⚡ Processing in batches of ${BATCH_SIZE} with ${BATCH_DELAY_MS}ms delays`);

  // Initialize progress bar
  const progressBar = new cliProgress.SingleBar({
    format:
      'RSS Discovery |{bar}| {percentage}% | {value}/{total} Members | ETA: {eta}s | {duration}s elapsed',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });

  progressBar.start(total, 0);

  const feedMap: RSSFeedMap = {};
  const allResults: DiscoveryResult[] = [];
  const allErrors: string[] = [];

  // Split members into batches
  const batches: CongressMember[][] = [];
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    batches.push(members.slice(i, i + BATCH_SIZE));
  }

  logger.info(`🚀 Processing ${batches.length} batches...`);

  // Process batches sequentially with delays between them
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    if (!batch || batch.length === 0) {
      continue;
    }

    try {
      const batchResults = await processBatch(batch, progressBar);
      allResults.push(...batchResults);

      // Update feed map with successful results
      for (const result of batchResults) {
        if (result.validFeeds.length > 0) {
          feedMap[result.bioguideId] = {
            name: result.name,
            feeds: result.validFeeds,
          };
        }

        if (result.errors.length > 0) {
          allErrors.push(`${result.bioguideId}: ${result.errors.join(', ')}`);
        }
      }

      // Add delay between batches (except for the last one)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    } catch (error) {
      allErrors.push(`Batch ${batchIndex + 1} failed: ${(error as Error).message}`);
      logger.error(`❌ Batch ${batchIndex + 1} failed: ${(error as Error).message}`);
    }
  }

  progressBar.stop();

  // Write the generated feed map
  const outputPath = path.resolve('src/config/rss-feed-map.json');
  await fs.writeFile(outputPath, JSON.stringify(feedMap, null, 2), 'utf8');

  // Generate summary report
  const summary = {
    totalMembers: total,
    membersWithFeeds: Object.keys(feedMap).length,
    coveragePercentage: Math.round((Object.keys(feedMap).length / total) * 100),
    generatedAt: new Date().toISOString(),
    optimizations: {
      batchSize: BATCH_SIZE,
      batchDelayMs: BATCH_DELAY_MS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      parallelUrlTesting: true,
    },
    results: allResults.map(r => ({
      bioguideId: r.bioguideId,
      name: r.name,
      chamber: r.chamber,
      state: r.state,
      feedCount: r.validFeeds.length,
      hasErrors: r.errors.length > 0,
    })),
    errors: allErrors,
  };

  const reportPath = path.resolve('rss-feed-discovery-report.json');
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), 'utf8');

  logger.info('\n🎉 Optimized RSS Feed Discovery Complete!');
  logger.info(
    `📊 Coverage: ${summary.membersWithFeeds}/${summary.totalMembers} members (${summary.coveragePercentage}%)`
  );
  logger.info(`📝 Feed map written to: ${outputPath}`);
  logger.info(`📋 Full report written to: ${reportPath}`);
  logger.info(`⚡ Performance: Processed ${total} members with parallel optimization`);

  if (summary.coveragePercentage >= 80) {
    logger.info('🎯 Target of >80% coverage achieved!');
  } else {
    logger.warn('⚠️  Coverage below 80% target');
  }
}

// Run the script
if (require.main === module) {
  generateRSSFeedMap().catch(error => {
    logger.error('💥 Fatal error:', error as Error);
    process.exit(1);
  });
}

export { generateRSSFeedMap };

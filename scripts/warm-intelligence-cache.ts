/**
 * Intelligence Cache Warming Script
 *
 * Pre-computes and caches intelligence analyzer results for all current
 * members of Congress. Useful before deployments or after cache flushes
 * to ensure fast page loads for representative intelligence cards.
 *
 * Usage:
 *   npx tsx scripts/warm-intelligence-cache.ts
 *   npx tsx scripts/warm-intelligence-cache.ts --dry-run
 *   npx tsx scripts/warm-intelligence-cache.ts --incremental
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { getRedisCache } from '@/lib/cache/redis-client';

// ── Configuration ────────────────────────────────────────────────────

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 5_000;

const isDryRun = process.argv.includes('--dry-run');
const isIncremental = process.argv.includes('--incremental');

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg: string) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ─────────────────────────────────────────────────────────────

async function warmIntelligenceCache() {
  const startTime = Date.now();
  log('Starting intelligence cache warming');

  // Fetch all current members
  log('Fetching all current legislators...');
  const allReps = await getAllEnhancedRepresentatives();
  log(`Fetched ${allReps.length} legislators`);

  if (isDryRun) {
    log('--- DRY RUN: listing all members ---');
    for (const rep of allReps) {
      console.log(`  ${rep.bioguideId}  ${rep.name}  (${rep.party}-${rep.state})`);
    }
    log(`Total: ${allReps.length} members`);
    process.exit(0);
  }

  const redis = getRedisCache();
  let warmed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < allReps.length; i += BATCH_SIZE) {
    const batch = allReps.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (rep, batchIdx) => {
        const memberStart = Date.now();
        const bioguideId = rep.bioguideId;
        const idx = i + batchIdx + 1;

        // In incremental mode, skip if all four cache keys already exist
        if (isIncremental) {
          const cached = await Promise.all([
            redis.get(`insight:finance_jurisdiction:${bioguideId}`),
            redis.get(`insight:vote_finance:${bioguideId}`),
            redis.get(`insight:vote_prediction:${bioguideId}`),
            redis.get(`insight:influence_chain:${bioguideId}`),
          ]);
          if (cached.every(c => c !== null)) {
            skipped++;
            return;
          }
        }

        const analyzerRuns: { label: string; run: () => Promise<unknown> }[] = [
          { label: 'fj', run: () => analyzeFinanceJurisdiction(bioguideId) },
          { label: 'vf', run: () => analyzeVoteFinance(bioguideId) },
          { label: 'vp', run: () => analyzeVotePrediction(bioguideId) },
          { label: 'ic', run: () => analyzeInfluenceChains(bioguideId) },
        ];

        const results = await Promise.allSettled(analyzerRuns.map(a => a.run()));
        const statusParts = results.map((r, i) => {
          const label = analyzerRuns[i]!.label;
          if (r.status === 'fulfilled') return `${label}: ok`;
          errors++;
          return `${label}: ERR`;
        });
        if (results.some(r => r.status === 'fulfilled')) {
          warmed++;
        }
        const elapsed = ((Date.now() - memberStart) / 1000).toFixed(1);
        log(
          `[${idx}/${allReps.length}] Warmed ${bioguideId} (${rep.name}) — ${statusParts.join(', ')}, ${elapsed}s`
        );
      })
    );

    // Sleep between batches (skip after last batch)
    if (i + BATCH_SIZE < allReps.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  log('=== Intelligence Cache Warming Complete ===');
  log(`Warmed ${warmed} members, ${skipped} skipped, ${errors} errors, total time ${totalTime}s`);
}

// ── Entry Point ──────────────────────────────────────────────────────

warmIntelligenceCache()
  .then(() => {
    log('Done.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

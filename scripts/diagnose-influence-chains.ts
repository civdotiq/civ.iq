/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Diagnose the influence-chain analyzer for specific members.
 *
 * The analyzer returns null from several places, and the API route turns every
 * one of them into the same 404 — which is why "Lobbying & influence is empty
 * for everyone" took a corpus audit to explain. This walks the same pipeline
 * step by step and reports where it stops: committees resolved, lobbying
 * organizations found, contribution matches, votes classified, chains kept.
 *
 * Usage:
 *   npx tsx scripts/diagnose-influence-chains.ts [bioguideId ...]
 *
 * Reads data/lda-filings.json.br unless LDA_FILINGS_URL is set. Clears each
 * member's cached insight first so every run recomputes.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ALL_COMMITTEE_MAPPINGS, normalizeCompanyName } from '@civiq/entity-resolution';
import {
  forEachFilingForCommittees,
  getFilingCorpusMeta,
} from '@/lib/data-sources/lda-corpus/load-filings';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getRedisCache } from '@/lib/cache/redis-client';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';

/** The members that returned 404 when the bug was reported (2026-07-30). */
const DEFAULT_MEMBERS = [
  'J000294', // Jeffries
  'P000197', // Pelosi
  'S000148', // Schumer
  'M000355', // McConnell
  'W000187', // Waters
  'N000002', // Nadler
  'A000370', // Adams
  'S001150', // Schiff
];

function normalizeCommitteeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function committeeCodesFor(names: string[], chamber: 'House' | 'Senate'): Map<string, string> {
  const prefix = chamber === 'House' ? 'H' : 'S';
  const codes = new Map<string, string>();
  for (const name of names) {
    const norm = normalizeCommitteeName(name);
    if (!norm) continue;
    const match = ALL_COMMITTEE_MAPPINGS.find(m => {
      if (!m.committeeCode.startsWith(prefix)) return false;
      const mNorm = normalizeCommitteeName(m.committeeName);
      return norm === mNorm || norm.includes(mNorm) || mNorm.includes(norm);
    });
    if (match && !codes.has(match.committeeCode)) codes.set(match.committeeCode, name);
  }
  return codes;
}

async function diagnose(bioguideId: string): Promise<void> {
  console.log(`\n── ${bioguideId} ───────────────────────────────`);

  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    console.log('  representative: NOT FOUND (analyzer returns null here)');
    return;
  }
  console.log(`  ${rep.name} (${rep.party}-${rep.state}), ${rep.chamber}`);

  const committeeNames = (rep.committees ?? []).map(c => c.name);
  const codes = committeeCodesFor(committeeNames, rep.chamber);
  console.log(
    `  committees: ${committeeNames.length} listed, ${codes.size} resolved to corpus codes`
  );
  console.log(`    ${[...codes].map(([code, name]) => `${code}=${name}`).join(', ') || '(none)'}`);
  if (codes.size === 0) {
    console.log(
      '  → corpus path unavailable for this member; analyzer falls back to the API sample'
    );
  }

  let filings = 0;
  let spend = 0;
  const orgs = new Set<string>();
  const available = await forEachFilingForCommittees([...codes.keys()], f => {
    filings += 1;
    spend += f.amount;
    orgs.add(normalizeCompanyName(f.clientName) || f.clientName.trim().toUpperCase());
  });
  console.log(
    available
      ? `  corpus filings: ${filings.toLocaleString()} rows, ${orgs.size.toLocaleString()} organizations, $${Math.round(spend).toLocaleString()} reported`
      : '  corpus filings: UNAVAILABLE (no data/lda-filings.json.br and no LDA_FILINGS_URL)'
  );

  await getRedisCache()
    .delete(`insight:influence_chain:${bioguideId}`)
    .catch(() => undefined);

  const started = Date.now();
  const insight = await analyzeInfluenceChains(bioguideId);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (!insight) {
    console.log(`  RESULT: null after ${elapsed}s → the route answers 404 (section renders empty)`);
    return;
  }
  console.log(
    `  RESULT: ${insight.chains.length} chains (${insight.totalChainsDetected} detected, ` +
      `${insight.chainsDropped} dropped) · confidence ${insight.confidence.toFixed(2)} ` +
      `· narrative ${insight.source} · ${elapsed}s`
  );
  console.log(`  renders in profile section: ${insight.confidence >= 0.5 ? 'YES' : 'NO'}`);
  for (const chain of insight.chains.slice(0, 3)) {
    console.log(
      `    ${chain.organization} — $${chain.lobbyingSpending.toLocaleString()} lobbying, ` +
        `$${chain.contributionAmount.toLocaleString()} contributed, voted ${chain.vote} on ${chain.billId}`
    );
  }
}

async function main(): Promise<void> {
  const members = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const ids = members.length > 0 ? members : DEFAULT_MEMBERS;

  const meta = await getFilingCorpusMeta();
  console.log(
    meta
      ? `Filing corpus: ${meta.rows.toLocaleString()} rows, ${meta.quarters.join(', ')}, generated ${meta.generatedAt}`
      : 'Filing corpus: UNAVAILABLE — build it with `npx tsx scripts/sync-lda-corpus.ts --filings`'
  );

  for (const id of ids) {
    try {
      await diagnose(id);
    } catch (error) {
      console.log(`  ERROR: ${(error as Error).message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Per-vote plain-language meaning.
 *
 * The deterministic glossary (context.ts) explains procedure; this
 * answers the reader's actual question: what did this vote decide, and
 * what did a Yea or Nay position mean? Same discipline as the
 * bill-summarizer: plain-language prompt, Flesch-Kincaid <= 8 with one
 * regeneration attempt, provenance fields, and a hard rule that failure
 * returns null — the digest shows nothing rather than something shaky.
 *
 * Roll calls are immutable, so meanings cache for a year and each vote
 * is generated at most once.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { cachedFetch } from '@/lib/cache';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT } from '@/lib/ai/plain-language';
import { trackReadingLevel } from '@/lib/analytics/reading-level-tracker';
import { BillSummarizer } from '@/features/legislation/services/ai/bill-summarizer';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import logger from '@/lib/logging/simple-logger';
import type { DigestVote } from './types';

export interface VoteMeaning {
  /** What the chamber decided, outcome included. 1-2 sentences. */
  decided: string;
  /** What voting Yea supported. Short phrase. */
  yeaMeant: string;
  /** What voting Nay supported. Short phrase. */
  nayMeant: string;
  readingLevel: number;
  confidence: number;
  source: 'ai-generated';
  generatedAt: string;
}

const CACHE_TTL = 365 * 24 * 60 * 60; // roll calls never change
const TARGET_GRADE_LEVEL = 8;
const MAX_FIELD_LENGTH = 400;
/** Official summaries change rarely; cache the CRS text for a month. */
const CRS_SUMMARY_TTL = 30 * 24 * 60 * 60;
/** Cap CRS text fed to the model — enough substance, bounded prompt cost. */
const MAX_CRS_SUMMARY_CHARS = 2000;

function cacheKey(voteId: string): string {
  return `vote-meaning:${voteId}`;
}

/**
 * Official Congress.gov CRS summary for a digest billId
 * (`${congress}-${type}-${number}`, e.g. "119-hr-1234"). Latest summary,
 * HTML stripped. Real government text the model may compress — the verified
 * input that lets bare act names ("KIDS Act") earn a plain-language meaning
 * instead of falling through to the procedural glossary. Returns null when
 * Congress has published no summary yet or on any failure.
 */
async function fetchOfficialBillSummary(billId: string): Promise<string | null> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return null;
  const match = /^(\d+)-([a-z]+)-(\d+)$/.exec(billId);
  if (!match) return null;
  const [, congress, type, number] = match;

  return cachedFetch<string | null>(
    `bill-crs-summary:${billId}`,
    async () => {
      const url = `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/summaries?format=json`;
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return null;

      const data = (await response.json()) as { summaries?: Array<{ text?: string }> };
      const summaries = data.summaries ?? [];
      if (summaries.length === 0) return null;

      // Latest summary reflects the most recent bill version.
      const latest = summaries[summaries.length - 1];
      const plainText = (latest?.text ?? '')
        .replace(/<[^>]+>/g, ' ')
        // CRS text carries HTML entities; decode the common ones so the model
        // reads prose, not markup.
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&sect;/g, 'Section ')
        .replace(/\s+/g, ' ')
        .trim();
      if (plainText.length < 50) return null;
      return plainText.slice(0, MAX_CRS_SUMMARY_CHARS);
    },
    CRS_SUMMARY_TTL
  );
}

function buildPrompt(vote: DigestVote, verifiedSummary: string, simpler: boolean): string {
  const measure = vote.bill?.title ? `Measure text: ${vote.bill.title}` : '';
  const summary = verifiedSummary ? `Verified summary of the measure: ${verifiedSummary}` : '';
  return [
    'Explain this congressional roll-call vote for a general reader.',
    '',
    `Chamber: ${vote.chamber}`,
    `Vote question: ${vote.question}`,
    `Result: ${vote.result} (${vote.yeas} yea, ${vote.nays} nay)`,
    measure,
    summary,
    '',
    'Return ONLY a JSON object, no markdown fences, with exactly these keys:',
    '{"decided": "...", "yeaMeant": "...", "nayMeant": "..."}',
    '',
    'Rules:',
    '- "decided": 1-2 sentences: the chamber, whether it passed or rejected the measure, the vote count, and WHAT THE MEASURE WOULD DO. Never write "a resolution", "the bill", or "the measure" without stating its substance — a reader who sees only this sentence must learn what was actually at stake.',
    '- "yeaMeant" / "nayMeant": one short phrase each stating the substantive effect that position supported. Never "agree/not agree with the measure" — say what agreeing would DO.',
    '- Example of the required style: {"decided": "The House rejected (189-235) a resolution that would require removing U.S. armed forces from hostilities in Lebanon.", "yeaMeant": "Remove U.S. forces from Lebanon", "nayMeant": "Leave the current deployment in place"}',
    '- Describe only what the measure itself does. No opinions, no motives, no predictions, no causal claims.',
    '- Call the measure a "bill" or "resolution", never a "law" — nothing here has been signed.',
    '- Use ONLY facts stated in the measure text or verified summary above. Never guess or infer what a bill does from its name.',
    '- Do not say a vote "was about" party politics or strategy.',
    `- Write at or below an ${TARGET_GRADE_LEVEL}th grade reading level. Use short, common words.`,
    simpler
      ? '- Your previous attempt was too complex. Use shorter sentences and simpler words.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseMeaning(raw: string): Pick<VoteMeaning, 'decided' | 'yeaMeant' | 'nayMeant'> | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const decided = typeof parsed.decided === 'string' ? parsed.decided.trim() : '';
    const yeaMeant = typeof parsed.yeaMeant === 'string' ? parsed.yeaMeant.trim() : '';
    const nayMeant = typeof parsed.nayMeant === 'string' ? parsed.nayMeant.trim() : '';
    if (!decided || !yeaMeant || !nayMeant) return null;
    if (
      decided.length > MAX_FIELD_LENGTH ||
      yeaMeant.length > MAX_FIELD_LENGTH ||
      nayMeant.length > MAX_FIELD_LENGTH
    ) {
      return null;
    }
    return { decided, yeaMeant, nayMeant };
  } catch {
    return null;
  }
}

async function generate(
  vote: DigestVote,
  verifiedSummary: string,
  simpler: boolean
): Promise<VoteMeaning | null> {
  const text = await generateAIText(
    PLAIN_LANGUAGE_SYSTEM_PROMPT,
    buildPrompt(vote, verifiedSummary, simpler),
    {
      temperature: 0.2,
      maxTokens: 400,
    }
  );
  const parsed = parseMeaning(text);
  if (!parsed) return null;

  // Measure prose only — vote tallies like "(198-224)" read as long words
  // and inflate the grade level without making the text harder.
  const prose = `${parsed.decided} ${parsed.yeaMeant}. ${parsed.nayMeant}.`.replace(
    /\(?\d[\d\-–,. ]*\)?/g,
    ' '
  );
  const metrics = BillSummarizer.calculateReadingMetrics(prose);
  return {
    ...parsed,
    readingLevel: metrics.gradeLevel,
    confidence: 0.8,
    source: 'ai-generated',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Meaning for one roll call — cached, generated at most once per vote.
 * Returns null on any failure or when no AI provider is configured.
 */
export async function getVoteMeaning(vote: DigestVote): Promise<VoteMeaning | null> {
  const cache = getRedisCache();
  const key = cacheKey(vote.voteId);

  try {
    const cached = await cache.get<VoteMeaning>(key);
    if (cached) return cached;

    // The model may only compress text it is given. Descriptive measure
    // titles carry their own substance; bare act names need the bill's
    // cached summary as verified input. With neither, we generate
    // nothing — observed failure mode: asked about "the KIDS Act" with
    // no content, the model invented different bill contents on every
    // run. The page falls back to the deterministic glossary instead.
    const measureWords = (vote.bill?.title ?? '').split(/\s+/).filter(Boolean).length;
    let verifiedSummary = '';
    if (vote.bill) {
      const billSummary = await BillSummaryCache.getSummary(vote.bill.billId).catch(() => null);
      if (billSummary?.whatItDoes) verifiedSummary = billSummary.whatItDoes;
      // No pre-generated summary in cache? Fall back to Congress.gov's own CRS
      // summary. Bills like "KIDS Act" or "TRIA Program Reauthorization Act"
      // have bare titles the model can't compress, so without this they'd show
      // only the procedural glossary. The CRS text is authoritative, so the
      // anti-fabrication rule holds — the model still only compresses given text.
      if (!verifiedSummary) {
        verifiedSummary = (await fetchOfficialBillSummary(vote.bill.billId)) ?? '';
      }
    }
    if (measureWords < 12 && !verifiedSummary && vote.bill) return null;

    let meaning = await generate(vote, verifiedSummary, false);
    if (meaning && meaning.readingLevel > TARGET_GRADE_LEVEL) {
      const simplified = await generate(vote, verifiedSummary, true);
      // Keep whichever attempt reads simpler; never fail a vote over grade level alone.
      if (simplified && simplified.readingLevel < meaning.readingLevel) meaning = simplified;
    }
    if (!meaning) return null;

    trackReadingLevel(meaning.readingLevel, `vote-${vote.voteId}`);
    await cache.set(key, meaning, CACHE_TTL);
    return meaning;
  } catch (error) {
    logger.warn('Vote meaning generation failed', {
      voteId: vote.voteId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Cache-only meaning lookup — never generates. Fast enough for the page
 * render path, where a synchronous LLM call would blow the function
 * timeout. Generation happens offline in the digest crons.
 */
export async function getCachedVoteMeaning(voteId: string): Promise<VoteMeaning | null> {
  try {
    const cached = await getRedisCache().get<VoteMeaning>(cacheKey(voteId));
    return cached ?? null;
  } catch {
    return null;
  }
}

/**
 * Attach already-cached meanings; votes without one stay bare and the page
 * shows the deterministic glossary. Read-only — no generation, no timeout
 * risk. Use this on the render path; use attachVoteMeanings in crons.
 */
export async function attachCachedVoteMeanings(votes: DigestVote[]): Promise<DigestVote[]> {
  const meanings = await Promise.all(votes.map(v => getCachedVoteMeaning(v.voteId)));
  return votes.map((vote, i) => {
    const meaning = meanings[i];
    return meaning ? { ...vote, meaning } : vote;
  });
}

/** Enrich votes with meanings, a few at a time. Failures leave votes bare. */
export async function attachVoteMeanings(
  votes: DigestVote[],
  concurrency: number = 4
): Promise<DigestVote[]> {
  const result = [...votes];
  for (let i = 0; i < result.length; i += concurrency) {
    const batch = result.slice(i, i + concurrency);
    const meanings = await Promise.all(batch.map(vote => getVoteMeaning(vote)));
    meanings.forEach((meaning, j) => {
      const vote = result[i + j];
      if (meaning && vote) result[i + j] = { ...vote, meaning };
    });
  }
  return result;
}

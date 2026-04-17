/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Company Entity Resolution
 *
 * Consolidates duplicate name normalization and matching logic from:
 * - fec-entity-resolution.ts (cleanNameForMatching, expandAbbreviation, levenshteinDistance)
 * - influence-chain-analyzer.ts (normalizeOrgName, validateTokenOverlap, levenshteinDistance)
 *
 * Single canonical implementation for cross-API company name matching
 * across EPA, OSHA, CFPB, SEC, FEC, and LDA data sources.
 */

import { IndustrySector } from './industry-taxonomy.js';
import { sicToSector } from './sic-sector-map.js';
import { findCompanyByAlias, type CompanyAlias } from './company-alias-table.js';

export interface ResolvedCompany {
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  sicCodes: string[];
  naicsCodes: string[];
  sector: IndustrySector | null;
  cik: string | null;
  confidence: number; // 0-1
}

/**
 * Common abbreviations used in FEC/lobbying data.
 * Maps normalized short forms to canonical uppercase names.
 * Consolidated from fec-entity-resolution.ts.
 */
const COMMON_ABBREVIATIONS: Record<string, string> = {
  jnj: 'JOHNSON AND JOHNSON',
  jj: 'JOHNSON AND JOHNSON',
  'j and j': 'JOHNSON AND JOHNSON',
  gm: 'GENERAL MOTORS',
  ge: 'GENERAL ELECTRIC',
  ibm: 'INTERNATIONAL BUSINESS MACHINES',
  att: 'AT AND T',
  'at t': 'AT AND T',
  jpmorgan: 'JPMORGAN CHASE',
  jpm: 'JPMORGAN CHASE',
  bofa: 'BANK OF AMERICA',
  pg: 'PROCTER AND GAMBLE',
  'p and g': 'PROCTER AND GAMBLE',
  msft: 'MICROSOFT',
  amzn: 'AMAZON',
  goog: 'ALPHABET',
  aapl: 'APPLE',
  pfizer: 'PFIZER',
  raytheon: 'RAYTHEON TECHNOLOGIES',
  lockmart: 'LOCKHEED MARTIN',
  ba: 'BOEING',
};

/**
 * Corporate suffixes to strip from company names.
 * Word-boundary matching catches them anywhere in the string.
 */
const SUFFIX_PATTERN =
  /\b(inc|llc|llp|corp|lp|ltd|co|company|corporation|incorporated|limited|holding|holdings|group|plc|sa|ag|gmbh)\b\.?/gi;

/**
 * Normalize a company name for matching.
 *
 * Consolidates cleanNameForMatching() (fec-entity-resolution.ts) and
 * normalizeOrgName() (influence-chain-analyzer.ts) into a single pipeline:
 *
 * 1. Trim and uppercase
 * 2. Strip corporate suffixes (word boundary, all occurrences)
 * 3. Normalize & to AND
 * 4. Remove non-word non-space characters
 * 5. Collapse whitespace
 * 6. Expand abbreviations (JNJ -> JOHNSON AND JOHNSON)
 */
export function normalizeCompanyName(name: string): string {
  let normalized = name
    .trim()
    .toUpperCase()
    .replace(SUFFIX_PATTERN, '')
    .replace(/&/g, ' AND ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Expand known abbreviations
  const lower = normalized.toLowerCase();
  if (COMMON_ABBREVIATIONS[lower]) {
    normalized = COMMON_ABBREVIATIONS[lower];
  }

  return normalized;
}

/**
 * Compute Levenshtein distance between two strings.
 * Uses Int32Array flat matrix for memory efficiency.
 *
 * Consolidated from both fec-entity-resolution.ts and
 * influence-chain-analyzer.ts (Int32Array version).
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const width = n + 1;
  const flat = new Int32Array((m + 1) * width);

  const get = (i: number, j: number): number => flat[i * width + j] as number;
  const set = (i: number, j: number, v: number): void => {
    flat[i * width + j] = v;
  };

  for (let i = 0; i <= m; i++) set(i, 0, i);
  for (let j = 0; j <= n; j++) set(0, j, j);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      set(
        i,
        j,
        Math.min(
          get(i - 1, j) + 1, // deletion
          get(i, j - 1) + 1, // insertion
          get(i - 1, j - 1) + cost // substitution
        )
      );
    }
  }

  return get(m, n);
}

/**
 * Compute similarity ratio between two strings (0-1).
 * 1.0 = identical, 0.0 = completely different.
 */
export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** Minimum token-level similarity to count as a match (handles typos like northrop/northrup) */
const TOKEN_SIMILARITY_THRESHOLD = 0.75;

/**
 * Validate that two normalized names share enough word tokens.
 *
 * Catches false positives that Levenshtein misses. For example:
 * "American Health Association" vs "American Heart Association" = 0.90 Levenshtein
 * But "Health" vs "Heart" = 0.6 token similarity -> correctly rejected.
 *
 * Each token from the shorter name must find a close match (>= 0.75
 * similarity) in the longer name. At least `threshold` fraction of the
 * shorter name's tokens must match.
 */
export function validateTokenOverlap(a: string, b: string, threshold: number = 0.7): boolean {
  const tokensA = a.split(/\s+/).filter(t => t.length > 0);
  const tokensB = b.split(/\s+/).filter(t => t.length > 0);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  const matches = shorter.filter(token =>
    longer.some(other => similarityRatio(token, other) >= TOKEN_SIMILARITY_THRESHOLD)
  ).length;

  return matches / shorter.length >= threshold;
}

/**
 * Check whether two company names refer to the same entity.
 *
 * Pipeline:
 * 1. Normalize both names
 * 2. Check alias table for canonical matches
 * 3. Levenshtein similarity with token overlap validation
 * 4. Optional SIC code cross-validation boost
 */
export function companiesMatch(
  a: string,
  b: string,
  context?: { sicCodeA?: string; sicCodeB?: string }
): { match: boolean; confidence: number } {
  const normA = normalizeCompanyName(a);
  const normB = normalizeCompanyName(b);

  // Exact match after normalization
  if (normA === normB) {
    return { match: true, confidence: 1.0 };
  }

  // Alias table lookup: if both resolve to the same canonical name
  const aliasA = findCompanyByAlias(a);
  const aliasB = findCompanyByAlias(b);
  if (aliasA && aliasB && aliasA.canonicalName === aliasB.canonicalName) {
    return { match: true, confidence: 0.95 };
  }

  // Levenshtein similarity
  const ratio = similarityRatio(normA, normB);
  if (ratio < 0.8) {
    return { match: false, confidence: ratio };
  }

  // Token overlap validation (catches false positives)
  if (!validateTokenOverlap(normA, normB)) {
    return { match: false, confidence: ratio * 0.5 };
  }

  // SIC code cross-validation boost
  let sicBoost = 0;
  if (context?.sicCodeA && context?.sicCodeB) {
    const sectorA = sicToSector(context.sicCodeA);
    const sectorB = sicToSector(context.sicCodeB);
    if (sectorA && sectorB && sectorA === sectorB) {
      sicBoost = 0.05;
    }
  }

  const confidence = Math.min(ratio + sicBoost, 1.0);
  return { match: confidence >= 0.8, confidence };
}

/**
 * Resolve a raw company name to its canonical form.
 * Uses alias table lookup and SIC/NAICS cross-validation.
 */
export function resolveCompanyName(
  rawName: string,
  context?: { sicCode?: string; naicsCode?: string; state?: string }
): ResolvedCompany | null {
  if (!rawName?.trim()) return null;

  const normalizedName = normalizeCompanyName(rawName);
  if (normalizedName.length === 0) return null;

  // Look up in alias table
  const alias = findCompanyByAlias(rawName);
  if (alias) {
    return resolveFromAlias(alias, normalizedName, context);
  }

  // No alias match: return normalized form with lower confidence
  let sector: IndustrySector | null = null;
  if (context?.sicCode) {
    sector = sicToSector(context.sicCode);
  }

  return {
    canonicalName: normalizedName,
    normalizedName,
    aliases: [rawName],
    sicCodes: context?.sicCode ? [context.sicCode] : [],
    naicsCodes: context?.naicsCode ? [context.naicsCode] : [],
    sector,
    cik: null,
    confidence: 0.5,
  };
}

function resolveFromAlias(
  alias: CompanyAlias,
  normalizedName: string,
  context?: { sicCode?: string; naicsCode?: string; state?: string }
): ResolvedCompany {
  let sectorFromContext: IndustrySector | null = null;
  if (context?.sicCode) {
    sectorFromContext = sicToSector(context.sicCode);
  }

  const sector = sectorFromContext ?? alias.sector;
  const sicMatch = sectorFromContext && alias.sector ? sectorFromContext === alias.sector : true;

  return {
    canonicalName: alias.canonicalName,
    normalizedName,
    aliases: alias.aliases,
    sicCodes: alias.sicCodes,
    naicsCodes: alias.naicsCodes,
    sector,
    cik: alias.cik,
    confidence: sicMatch ? 0.95 : 0.8,
  };
}

/**
 * Batch resolve company names, deduplicating entries that resolve to the same entity.
 */
export function resolveCompanyNames(
  entries: Array<{
    name: string;
    source: string;
    context?: { sicCode?: string; naicsCode?: string; state?: string };
  }>
): Map<string, ResolvedCompany> {
  const results = new Map<string, ResolvedCompany>();

  for (const entry of entries) {
    const resolved = resolveCompanyName(entry.name, entry.context);
    if (!resolved) continue;

    const key = resolved.canonicalName;
    const existing = results.get(key);

    if (existing) {
      mergeInto(existing, entry.name, resolved);
      continue;
    }

    // Check if this matches an existing entry by name similarity
    let merged = false;
    for (const [existingKey, existingResolved] of results) {
      const matchResult = companiesMatch(resolved.canonicalName, existingKey, {
        sicCodeA: resolved.sicCodes[0],
        sicCodeB: existingResolved.sicCodes[0],
      });
      if (matchResult.match) {
        mergeInto(existingResolved, entry.name, resolved);
        existingResolved.confidence = Math.max(existingResolved.confidence, matchResult.confidence);
        merged = true;
        break;
      }
    }

    if (!merged) {
      results.set(key, resolved);
    }
  }

  return results;
}

function mergeInto(target: ResolvedCompany, newAlias: string, source: ResolvedCompany): void {
  if (!target.aliases.includes(newAlias)) {
    target.aliases.push(newAlias);
  }
  for (const sic of source.sicCodes) {
    if (!target.sicCodes.includes(sic)) {
      target.sicCodes.push(sic);
    }
  }
  for (const naics of source.naicsCodes) {
    if (!target.naicsCodes.includes(naics)) {
      target.naicsCodes.push(naics);
    }
  }
  target.confidence = Math.max(target.confidence, source.confidence);
  if (!target.cik && source.cik) {
    target.cik = source.cik;
  }
}

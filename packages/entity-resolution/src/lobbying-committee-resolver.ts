/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying Committee Resolver
 *
 * Three-tier resolution for LDA government_entities strings:
 * 1. Noise filter — skip generic entries like "SENATE", "U.S. Congress"
 * 2. Exact alias match — lookup in COMMITTEE_ALIASES then AGENCY_ALIASES
 * 3. Fuzzy match — Fuse.js against ALL_COMMITTEE_MAPPINGS names (threshold 0.15)
 *
 * Resolves both committees (primary) and agencies (secondary).
 * Agencies give us oversight committees via getCommitteesForAgency().
 */

import Fuse from 'fuse.js';
import { ALL_COMMITTEE_MAPPINGS, getCommitteesForAgency } from './committee-agency-map.js';
import { COMMITTEE_ALIASES, AGENCY_ALIASES } from './committee-alias-table.js';
import type { GovernmentEntityResolution } from './types.js';
import { getLogger } from './logger.js';

// ── Noise Filter ─────────────────────────────────────────────────────

const NOISE_ENTITIES = new Set([
  'senate',
  'house of representatives',
  'house',
  'u.s. congress',
  'us congress',
  'congress',
  'white house',
  'the white house',
  'executive office of the president',
  'president',
  'vice president',
  'federal government',
  'u.s. government',
  'us government',
  'none',
  'n/a',
  '',
]);

function isNoise(entity: string): boolean {
  return NOISE_ENTITIES.has(entity.toLowerCase().trim());
}

// ── Fuzzy Search ─────────────────────────────────────────────────────

interface FuseItem {
  committeeCode: string;
  committeeName: string;
  chamber: string;
  searchText: string;
}

const fuseItems: FuseItem[] = ALL_COMMITTEE_MAPPINGS.map(m => ({
  committeeCode: m.committeeCode,
  committeeName: m.committeeName,
  chamber: m.chamber,
  searchText: `${m.chamber} ${m.committeeName}`,
}));

const fuse = new Fuse(fuseItems, {
  keys: ['searchText', 'committeeName'],
  threshold: 0.15, // 85%+ similarity per roadmap
  includeScore: true,
});

// ── Resolution ───────────────────────────────────────────────────────

/**
 * Resolve a single government_entities string to a committee, agency, or noise.
 */
export function resolveGovernmentEntity(entity: string): GovernmentEntityResolution {
  const raw = entity.trim();
  const normalized = raw.toLowerCase();

  // Tier 1: Noise filter
  if (isNoise(normalized)) {
    return { rawText: raw, type: 'noise', confidence: 0 };
  }

  // Tier 2a: Exact committee alias match
  const committeeCode = COMMITTEE_ALIASES.get(normalized);
  if (committeeCode) {
    const mapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === committeeCode);
    return {
      rawText: raw,
      type: 'committee',
      committeeCode,
      committeeName: mapping?.committeeName ?? committeeCode,
      confidence: 1.0,
    };
  }

  // Tier 2b: Exact agency alias match
  const agencySlug = AGENCY_ALIASES.get(normalized);
  if (agencySlug) {
    return {
      rawText: raw,
      type: 'agency',
      agencySlug,
      confidence: 1.0,
    };
  }

  // Tier 3: Fuzzy match against committee names
  const results = fuse.search(normalized);
  if (results.length > 0) {
    const best = results[0]!;
    const score = best.score ?? 1;
    // Fuse.js score: 0 = perfect match, 1 = no match
    // Convert to confidence: 1 - score
    const confidence = Math.round((1 - score) * 100) / 100;

    if (confidence >= 0.85) {
      return {
        rawText: raw,
        type: 'committee',
        committeeCode: best.item.committeeCode,
        committeeName: best.item.committeeName,
        confidence,
      };
    }
  }

  return { rawText: raw, type: 'unresolved', confidence: 0 };
}

/**
 * Resolve an array of government_entities strings.
 */
export function resolveFilingEntities(entities: string[]): GovernmentEntityResolution[] {
  return entities.map(resolveGovernmentEntity);
}

/**
 * Extract resolved committees from resolution results.
 * Includes committees derived from agency resolution via getCommitteesForAgency().
 */
export function getResolvedCommittees(
  resolutions: GovernmentEntityResolution[]
): Array<{ committeeCode: string; committeeName: string; confidence: number }> {
  const seen = new Map<string, { committeeName: string; confidence: number }>();

  for (const r of resolutions) {
    if (r.type === 'committee' && r.committeeCode) {
      const existing = seen.get(r.committeeCode);
      if (!existing || existing.confidence < r.confidence) {
        seen.set(r.committeeCode, {
          committeeName: r.committeeName ?? r.committeeCode,
          confidence: r.confidence,
        });
      }
    }

    // Derive committees from resolved agencies
    if (r.type === 'agency' && r.agencySlug) {
      const oversightCommittees = getCommitteesForAgency(r.agencySlug);
      for (const c of oversightCommittees) {
        const existing = seen.get(c.committeeCode);
        // Agency-derived committees get slightly lower confidence
        const derivedConfidence = Math.round(r.confidence * 0.9 * 100) / 100;
        if (!existing || existing.confidence < derivedConfidence) {
          seen.set(c.committeeCode, {
            committeeName: c.committeeName,
            confidence: derivedConfidence,
          });
        }
      }
    }
  }

  const result = Array.from(seen.entries()).map(([committeeCode, data]) => ({
    committeeCode,
    committeeName: data.committeeName,
    confidence: data.confidence,
  }));

  if (result.length > 0) {
    getLogger().debug('[LobbyingResolver] Resolved committees', {
      count: result.length,
      codes: result.map(r => r.committeeCode),
    });
  }

  return result;
}

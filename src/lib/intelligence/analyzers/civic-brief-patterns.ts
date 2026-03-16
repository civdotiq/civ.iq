/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Brief Pattern Detection
 *
 * 7 statistical pattern detectors for the civic intelligence brief.
 * Each detector: takes assembled data → returns BriefPattern | null.
 * Pure statistics — no AI. Significance threshold: z-score ≥ 1.5.
 *
 * Headlines are written for citizens, not analysts.
 */

import type {
  BriefPattern,
  BriefFunding,
  BriefVoting,
  BriefIdentity,
  BriefOversight,
} from '../types';

/** Minimum z-score/effect size to surface a pattern */
const SIGNIFICANCE_THRESHOLD = 1.5;

/** All assembled data passed to pattern detectors */
export interface PatternInput {
  identity: BriefIdentity;
  funding: BriefFunding;
  voting: BriefVoting;
  oversight: BriefOversight;
  /** Average party alignment for same-chamber peers (0-100) */
  peerPartyAlignmentPct: number | null;
  /** Standard deviation of party alignment among peers */
  peerPartyAlignmentStd: number | null;
  /** Average in-state funding % among peers */
  peerInStatePctMean: number | null;
  /** Std dev of in-state funding % among peers */
  peerInStatePctStd: number | null;
}

/** Run all 7 pattern detectors and return significant ones, sorted by significance */
export function detectPatterns(input: PatternInput): BriefPattern[] {
  const detectors: Array<(input: PatternInput) => BriefPattern | null> = [
    detectFundingJurisdictionOverlap,
    detectVotingPartyDivergence,
    detectDonorConcentration,
    detectInStateFundingRatio,
    detectCommitteePowerPosition,
    detectLobbyingLegislationAlignment,
    detectLegislationFocusShift,
  ];

  return detectors
    .map(fn => fn(input))
    .filter((p): p is BriefPattern => p !== null && p.significance >= SIGNIFICANCE_THRESHOLD)
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 5);
}

/** Template text generators for deterministic fallback */
export function getPatternTemplate(pattern: BriefPattern): string {
  return `${pattern.headline} ${pattern.detail}`;
}

// ── Helpers ──────────────────────────────────────────────────────────

const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

function lastName(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length <= 1) return name;
  const last = parts[parts.length - 1] ?? name;
  if (SUFFIXES.has(last.toLowerCase()) && parts.length > 2) {
    return parts[parts.length - 2] ?? name;
  }
  return last;
}

// ── Pattern 1: Funding-Jurisdiction Overlap ──────────────────────────

function detectFundingJurisdictionOverlap(input: PatternInput): BriefPattern | null {
  const overlapSectors = input.funding.topSectors.filter(s => s.overlapsCommittee);
  if (overlapSectors.length === 0 || input.funding.contributionsSampled < 10) return null;

  const overlapPct = overlapSectors.reduce((sum, s) => sum + s.pct, 0);
  const significance = overlapPct / 25;

  if (significance < SIGNIFICANCE_THRESHOLD) return null;

  const topOverlap = overlapSectors[0];
  if (!topOverlap) return null;

  const last = lastName(input.identity.name);

  return {
    type: 'funding-jurisdiction-overlap',
    headline: `${last}'s biggest donors work in industries their committees oversee.`,
    detail: `${overlapPct.toFixed(0)}% of sampled campaign donations come from sectors that fall under the jurisdiction of committees ${input.identity.name} serves on. The largest overlap is ${topOverlap.sector}, which donated $${topOverlap.amount.toLocaleString()} (${topOverlap.pct.toFixed(0)}% of sampled contributions).`,
    dataPoints: {
      overlapPct: Math.round(overlapPct),
      overlapSectorCount: overlapSectors.length,
      topOverlapSector: topOverlap.sector,
      topOverlapAmount: topOverlap.amount,
    },
    significance,
  };
}

// ── Pattern 2: Voting Party Divergence ───────────────────────────────

function detectVotingPartyDivergence(input: PatternInput): BriefPattern | null {
  if (
    input.voting.partyAlignmentPct === null ||
    input.peerPartyAlignmentPct === null ||
    input.peerPartyAlignmentStd === null ||
    input.peerPartyAlignmentStd === 0
  ) {
    return null;
  }

  const zScore =
    (input.peerPartyAlignmentPct - input.voting.partyAlignmentPct) / input.peerPartyAlignmentStd;
  const absZ = Math.abs(zScore);

  if (absZ < SIGNIFICANCE_THRESHOLD) return null;

  const diffPct = Math.abs(input.voting.partyAlignmentPct - input.peerPartyAlignmentPct);
  const last = lastName(input.identity.name);
  const partyName =
    input.identity.party === 'D'
      ? 'Democratic'
      : input.identity.party === 'R'
        ? 'Republican'
        : input.identity.party;

  if (zScore > 0) {
    return {
      type: 'voting-party-divergence',
      headline: `${last} breaks from their party more often than most ${input.identity.chamber} ${partyName}s.`,
      detail: `${input.identity.name} votes with their party ${input.voting.partyAlignmentPct.toFixed(0)}% of the time, compared to ${input.peerPartyAlignmentPct.toFixed(0)}% for the average ${input.identity.chamber} ${partyName}. That is ${diffPct.toFixed(0)} percentage points below the peer average across ${input.voting.totalVotes} votes.`,
      dataPoints: {
        partyAlignmentPct: input.voting.partyAlignmentPct,
        peerAveragePct: input.peerPartyAlignmentPct,
        differencePct: Math.round(diffPct * 10) / 10,
        totalVotes: input.voting.totalVotes,
      },
      significance: absZ,
    };
  }

  return {
    type: 'voting-party-divergence',
    headline: `${last} votes with their party more often than most ${input.identity.chamber} ${partyName}s.`,
    detail: `${input.identity.name} votes with their party ${input.voting.partyAlignmentPct.toFixed(0)}% of the time, compared to ${input.peerPartyAlignmentPct.toFixed(0)}% for the average ${input.identity.chamber} ${partyName}. That is ${diffPct.toFixed(0)} percentage points above the peer average across ${input.voting.totalVotes} votes.`,
    dataPoints: {
      partyAlignmentPct: input.voting.partyAlignmentPct,
      peerAveragePct: input.peerPartyAlignmentPct,
      differencePct: Math.round(diffPct * 10) / 10,
      totalVotes: input.voting.totalVotes,
    },
    significance: absZ,
  };
}

// ── Pattern 3: Legislation Focus Shift ───────────────────────────────

function detectLegislationFocusShift(input: PatternInput): BriefPattern | null {
  const sponsored = input.voting.billsSponsored;
  const cosponsored = input.voting.billsCosponsored;

  if (sponsored + cosponsored < 5) return null;

  const ratio = sponsored > 0 ? cosponsored / sponsored : 0;
  if (ratio < 3 && sponsored >= 5) {
    const last = lastName(input.identity.name);
    return {
      type: 'legislation-focus-shift',
      headline: `${last} writes more of their own bills than most legislators.`,
      detail: `${input.identity.name} sponsored ${sponsored} bills and cosponsored ${cosponsored}, a ratio of ${ratio.toFixed(0)}-to-1. Most legislators cosponsor 10 to 20 times more bills than they write themselves. A lower ratio can indicate focused legislative priorities.`,
      dataPoints: {
        billsSponsored: sponsored,
        billsCosponsored: cosponsored,
        cosponsorRatio: Math.round(ratio * 10) / 10,
      },
      significance: ratio < 2 ? 2.0 : 1.6,
    };
  }

  return null;
}

// ── Pattern 4: Donor Concentration ───────────────────────────────────

function detectDonorConcentration(input: PatternInput): BriefPattern | null {
  if (input.funding.topSectors.length === 0 || input.funding.contributionsSampled < 10) {
    return null;
  }

  const topSector = input.funding.topSectors[0];
  if (!topSector) return null;

  const significance = topSector.pct / 25;
  if (significance < SIGNIFICANCE_THRESHOLD) return null;

  const last = lastName(input.identity.name);

  return {
    type: 'donor-concentration',
    headline: `Most of ${last}'s campaign money comes from one industry: ${topSector.sector}.`,
    detail: `${topSector.sector} accounts for ${topSector.pct.toFixed(0)}% of sampled contributions ($${topSector.amount.toLocaleString()}).${input.funding.topSectors[1] ? ` The next largest sector is ${input.funding.topSectors[1].pct.toFixed(0)}%.` : ''} When one industry dominates a campaign's funding, it is worth watching how the legislator votes on issues that affect that industry.`,
    dataPoints: {
      topSector: topSector.sector,
      topSectorPct: Math.round(topSector.pct),
      topSectorAmount: topSector.amount,
      secondSectorPct: Math.round((input.funding.topSectors[1]?.pct ?? 0) * 10) / 10,
    },
    significance,
  };
}

// ── Pattern 5: In-State Funding Ratio ────────────────────────────────

function detectInStateFundingRatio(input: PatternInput): BriefPattern | null {
  if (
    input.funding.inStatePct === null ||
    input.peerInStatePctMean === null ||
    input.peerInStatePctStd === null ||
    input.peerInStatePctStd === 0
  ) {
    return null;
  }

  const zScore = (input.funding.inStatePct - input.peerInStatePctMean) / input.peerInStatePctStd;
  const absZ = Math.abs(zScore);

  if (absZ < SIGNIFICANCE_THRESHOLD) return null;

  const last = lastName(input.identity.name);
  const outOfStatePct = 100 - input.funding.inStatePct;

  if (zScore < 0) {
    return {
      type: 'in-state-funding-ratio',
      headline: `Most of ${last}'s money comes from outside ${input.identity.state}.`,
      detail: `${outOfStatePct.toFixed(0)}% of sampled donations come from out of state, compared to a ${input.identity.chamber} average of ${(100 - input.peerInStatePctMean).toFixed(0)}%. Only ${input.funding.inStatePct.toFixed(0)}% of donations come from within ${input.identity.state}. This is based on ${input.funding.contributionsSampled} sampled contributions from the ${input.funding.cycle} cycle.`,
      dataPoints: {
        inStatePct: Math.round(input.funding.inStatePct),
        peerMeanPct: Math.round(input.peerInStatePctMean),
        outOfStatePct: Math.round(outOfStatePct),
        contributionsSampled: input.funding.contributionsSampled,
      },
      significance: absZ,
    };
  }

  return {
    type: 'in-state-funding-ratio',
    headline: `${last} gets more of their money from within ${input.identity.state} than most peers.`,
    detail: `${input.funding.inStatePct.toFixed(0)}% of sampled donations come from within ${input.identity.state}, compared to a ${input.identity.chamber} average of ${input.peerInStatePctMean.toFixed(0)}%. This is based on ${input.funding.contributionsSampled} sampled contributions from the ${input.funding.cycle} cycle.`,
    dataPoints: {
      inStatePct: Math.round(input.funding.inStatePct),
      peerMeanPct: Math.round(input.peerInStatePctMean),
      outOfStatePct: Math.round(outOfStatePct),
      contributionsSampled: input.funding.contributionsSampled,
    },
    significance: absZ,
  };
}

// ── Pattern 6: Committee Power Position ──────────────────────────────

function detectCommitteePowerPosition(input: PatternInput): BriefPattern | null {
  const powerRoles = input.identity.committees.filter(
    c => c.role.toLowerCase().includes('chair') || c.role.toLowerCase().includes('ranking')
  );

  if (powerRoles.length === 0) return null;

  const significance = powerRoles.length >= 2 ? 2.5 : 1.8;
  const last = lastName(input.identity.name);

  const roleDescriptions = powerRoles.map(c => {
    const role = c.role.toLowerCase().includes('chair') ? 'chairs' : 'is ranking member of';
    return `${role} the ${c.name}`;
  });

  return {
    type: 'committee-power-position',
    headline: `${last} holds a leadership role on ${powerRoles.length === 1 ? 'a key committee' : `${powerRoles.length} committees`}.`,
    detail: `${input.identity.name} ${roleDescriptions.join(' and ')}. Committee leaders decide which bills get hearings and votes, giving them more influence over legislation than rank-and-file members.`,
    dataPoints: {
      leadershipPositions: powerRoles.length,
      totalCommittees: input.identity.committees.length,
      roles: powerRoles.map(c => `${c.role} of ${c.name}`).join('; '),
    },
    significance,
  };
}

// ── Pattern 7: Lobbying-Legislation Alignment ────────────────────────

function detectLobbyingLegislationAlignment(input: PatternInput): BriefPattern | null {
  if (
    input.oversight.lobbyingAlignmentScore === null ||
    input.oversight.topLobbyingMatches.length === 0
  ) {
    return null;
  }

  const significance = input.oversight.lobbyingAlignmentScore * 4;

  if (significance < SIGNIFICANCE_THRESHOLD) return null;

  const topMatch = input.oversight.topLobbyingMatches[0];
  if (!topMatch) return null;

  const last = lastName(input.identity.name);

  return {
    type: 'lobbying-legislation-alignment',
    headline: `Some of ${last}'s bills use language similar to lobbying filings.`,
    detail: `${input.oversight.topLobbyingMatches.length} lobbying filings contain language that matches bills ${input.identity.name} sponsored or cosponsored. The closest match is between a filing by ${topMatch.filing} and the bill "${topMatch.bill}" (${(topMatch.similarity * 100).toFixed(0)}% text similarity). Similar language is common and does not mean coordination occurred.`,
    dataPoints: {
      alignmentScore: Math.round(input.oversight.lobbyingAlignmentScore * 100),
      matchCount: input.oversight.topLobbyingMatches.length,
      topSimilarity: Math.round(topMatch.similarity * 100),
    },
    significance,
  };
}

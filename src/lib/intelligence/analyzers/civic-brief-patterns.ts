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
  BriefPatternSource,
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
  /** Bioguide ID for constructing citation URLs */
  bioguideId: string;
  /** FEC candidate ID for constructing FEC URLs (null if unmapped) */
  fecId: string | null;
}

/** Run all 8 pattern detectors and return significant ones, sorted by significance */
export function detectPatterns(input: PatternInput): BriefPattern[] {
  const detectors: Array<(input: PatternInput) => BriefPattern | null> = [
    detectFundingJurisdictionOverlap,
    detectVotingPartyDivergence,
    detectDonorConcentration,
    detectInStateFundingRatio,
    detectCommitteePowerPosition,
    detectLobbyingLegislationAlignment,
    detectLegislationFocusShift,
    detectLegislativeEffectiveness,
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

function congressSource(bioguideId: string): BriefPatternSource {
  return { label: 'Congress.gov', url: `https://www.congress.gov/member/_/${bioguideId}` };
}

function fecSource(fecId: string | null): BriefPatternSource {
  if (fecId) return { label: 'FEC.gov', url: `https://www.fec.gov/data/candidate/${fecId}/` };
  return { label: 'FEC.gov', url: 'https://www.fec.gov/data/' };
}

function ldaSource(): BriefPatternSource {
  return {
    label: 'Senate LDA filings',
    url: 'https://lda.gov/filings/public/filing/search/',
  };
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

  const committeeName =
    input.identity.committees.find(c => input.funding.topSectors.some(s => s.overlapsCommittee))
      ?.name ?? 'their committee';

  return {
    type: 'funding-jurisdiction-overlap',
    headline: `${last}'s top donors come from industries their committees regulate.`,
    detail: `${input.identity.name} sits on ${committeeName}, which oversees policy affecting the ${topOverlap.sector} industry. That same industry gave $${topOverlap.amount.toLocaleString()} to their campaign — ${overlapPct.toFixed(0)}% of donations reviewed came from industries under their committees. This does not prove wrongdoing, but it means the people funding their campaign have a direct stake in their committee work.`,
    dataPoints: {
      overlapPct: Math.round(overlapPct),
      overlapSectorCount: overlapSectors.length,
      topOverlapSector: topOverlap.sector,
      topOverlapAmount: topOverlap.amount,
    },
    significance,
    sources: [fecSource(input.fecId), congressSource(input.bioguideId)],
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
      headline: `${last} votes against their own party more than most ${partyName}s.`,
      detail: `In ${input.voting.totalVotes} recorded votes, ${input.identity.name} sided with their party ${input.voting.partyAlignmentPct.toFixed(0)}% of the time. The average ${input.identity.chamber} ${partyName} votes with the party ${input.peerPartyAlignmentPct.toFixed(0)}% of the time. That ${diffPct.toFixed(0)}-point gap means ${last} is more willing to cross party lines than most of their colleagues.`,
      dataPoints: {
        partyAlignmentPct: input.voting.partyAlignmentPct,
        peerAveragePct: input.peerPartyAlignmentPct,
        differencePct: Math.round(diffPct * 10) / 10,
        totalVotes: input.voting.totalVotes,
      },
      significance: absZ,
      sources: [congressSource(input.bioguideId)],
    };
  }

  return {
    type: 'voting-party-divergence',
    headline: `${last} is one of the most reliable ${partyName} votes in the ${input.identity.chamber}.`,
    detail: `In ${input.voting.totalVotes} recorded votes, ${input.identity.name} sided with their party ${input.voting.partyAlignmentPct.toFixed(0)}% of the time. The average ${input.identity.chamber} ${partyName} votes with the party ${input.peerPartyAlignmentPct.toFixed(0)}% of the time. That ${diffPct.toFixed(0)}-point difference means ${last} rarely breaks ranks.`,
    dataPoints: {
      partyAlignmentPct: input.voting.partyAlignmentPct,
      peerAveragePct: input.peerPartyAlignmentPct,
      differencePct: Math.round(diffPct * 10) / 10,
      totalVotes: input.voting.totalVotes,
    },
    significance: absZ,
    sources: [congressSource(input.bioguideId)],
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
      headline: `${last} authors their own legislation more than most.`,
      detail: `${input.identity.name} wrote ${sponsored} bills and signed on to ${cosponsored} others. Most legislators co-sign far more bills than they write — typically 10 to 20 times more. ${last}'s ratio of ${ratio.toFixed(0)}-to-1 suggests they focus on advancing their own policy priorities rather than just adding their name to colleagues' work.`,
      dataPoints: {
        billsSponsored: sponsored,
        billsCosponsored: cosponsored,
        cosponsorRatio: Math.round(ratio * 10) / 10,
      },
      significance: ratio < 2 ? 2.0 : 1.6,
      sources: [congressSource(input.bioguideId)],
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
    headline: `One industry — ${topSector.sector} — dominates ${last}'s campaign funding.`,
    detail: `The ${topSector.sector} industry gave $${topSector.amount.toLocaleString()} to ${input.identity.name}'s campaign, making up ${topSector.pct.toFixed(0)}% of the donations we reviewed.${input.funding.topSectors[1] ? ` No other industry comes close — the next largest gave just ${input.funding.topSectors[1].pct.toFixed(0)}%.` : ''} When one industry provides this much of a campaign's funding, voters may want to watch how ${last} votes on issues affecting that industry.`,
    dataPoints: {
      topSector: topSector.sector,
      topSectorPct: Math.round(topSector.pct),
      topSectorAmount: topSector.amount,
      secondSectorPct: Math.round((input.funding.topSectors[1]?.pct ?? 0) * 10) / 10,
    },
    significance,
    sources: [fecSource(input.fecId)],
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
      headline: `Most of ${last}'s campaign money comes from outside ${input.identity.state}.`,
      detail: `Only ${input.funding.inStatePct.toFixed(0)}% of ${input.identity.name}'s donations came from people in ${input.identity.state} — the rest came from out of state. For comparison, the typical ${input.identity.chamber} member gets about ${input.peerInStatePctMean.toFixed(0)}% of their money from within their own state. This can mean national interest groups are more invested in this race than local donors. Based on ${input.funding.contributionsSampled} donations from the ${input.funding.cycle} cycle.`,
      dataPoints: {
        inStatePct: Math.round(input.funding.inStatePct),
        peerMeanPct: Math.round(input.peerInStatePctMean),
        outOfStatePct: Math.round(outOfStatePct),
        contributionsSampled: input.funding.contributionsSampled,
      },
      significance: absZ,
      sources: [fecSource(input.fecId)],
    };
  }

  return {
    type: 'in-state-funding-ratio',
    headline: `${last}'s donors are mostly from ${input.identity.state} — more local than most.`,
    detail: `${input.funding.inStatePct.toFixed(0)}% of ${input.identity.name}'s donations came from people in ${input.identity.state}. The typical ${input.identity.chamber} member gets about ${input.peerInStatePctMean.toFixed(0)}% from their own state, so ${last}'s funding is more locally driven than average. Based on ${input.funding.contributionsSampled} donations from the ${input.funding.cycle} cycle.`,
    dataPoints: {
      inStatePct: Math.round(input.funding.inStatePct),
      peerMeanPct: Math.round(input.peerInStatePctMean),
      outOfStatePct: Math.round(outOfStatePct),
      contributionsSampled: input.funding.contributionsSampled,
    },
    significance: absZ,
    sources: [fecSource(input.fecId)],
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
    headline: `${last} leads ${powerRoles.length === 1 ? 'a committee' : `${powerRoles.length} committees`} — that gives them extra power.`,
    detail: `${input.identity.name} ${roleDescriptions.join(' and ')}. Why this matters: committee leaders control which bills get a hearing and which ones never come up for a vote. This gives ${last} more power to shape legislation than most members of Congress.`,
    dataPoints: {
      leadershipPositions: powerRoles.length,
      totalCommittees: input.identity.committees.length,
      roles: powerRoles.map(c => `${c.role} of ${c.name}`).join('; '),
    },
    significance,
    sources: [congressSource(input.bioguideId)],
  };
}

// ── Pattern 7: Legislative Effectiveness ──────────────────────────────

function detectLegislativeEffectiveness(input: PatternInput): BriefPattern | null {
  const { billsSponsored, billsProgressed } = input.voting;
  if (billsProgressed === undefined || billsSponsored < 3) return null;

  const progressRate = billsProgressed / billsSponsored;
  // Typical progression rate is ~5-10%. Above 10% is noteworthy, above 20% is remarkable.
  // Below 1% with enough bills is also noteworthy (all bills stalled).
  const last = lastName(input.identity.name);

  if (progressRate >= 0.1) {
    const significance = progressRate >= 0.2 ? 2.5 : 1.8;
    return {
      type: 'legislative-effectiveness',
      headline: `${billsProgressed} of ${billsSponsored} bills ${last} wrote moved past introduction — better than typical.`,
      detail: `Most bills in Congress never get a hearing — only about 5-10% of sponsored bills advance past introduction. ${input.identity.name} got ${billsProgressed} of their ${billsSponsored} bills to clear that hurdle this session, a ${(progressRate * 100).toFixed(0)}% success rate. This suggests ${last}'s legislation is getting traction with colleagues.`,
      dataPoints: {
        billsSponsored,
        billsProgressed,
        progressRate: Math.round(progressRate * 100),
      },
      significance,
      sources: [congressSource(input.bioguideId)],
    };
  }

  if (billsSponsored >= 10 && billsProgressed === 0) {
    return {
      type: 'legislative-effectiveness',
      headline: `None of ${last}'s ${billsSponsored} bills have moved past introduction.`,
      detail: `${input.identity.name} has written ${billsSponsored} bills this session, but none have advanced past the introduction stage. This is not unusual — most bills die in committee — but it means none of ${last}'s legislative priorities have gained enough support to move forward yet.`,
      dataPoints: {
        billsSponsored,
        billsProgressed: 0,
        progressRate: 0,
      },
      significance: 1.6,
      sources: [congressSource(input.bioguideId)],
    };
  }

  return null;
}

// ── Pattern 8: Lobbying-Legislation Alignment ────────────────────────

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
    headline: `Lobbying groups used similar language to bills ${last} backed.`,
    detail: `We compared the text of lobbying filings to bills ${input.identity.name} sponsored or co-signed. ${input.oversight.topLobbyingMatches.length} filings used similar wording. The closest match: ${topMatch.filing} filed lobbying paperwork that overlaps ${(topMatch.similarity * 100).toFixed(0)}% with the bill "${topMatch.bill}." This is common — lobbyists and legislators often draw from the same policy language — and does not mean they coordinated.`,
    dataPoints: {
      alignmentScore: Math.round(input.oversight.lobbyingAlignmentScore * 100),
      matchCount: input.oversight.topLobbyingMatches.length,
      topSimilarity: Math.round(topMatch.similarity * 100),
    },
    significance,
    sources: [ldaSource(), congressSource(input.bioguideId)],
  };
}

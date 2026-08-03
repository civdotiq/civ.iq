/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Corpus-backed replacement for `senateLobbyingAPI.getCommitteeLobbyingData`.
 *
 * That method reads `fetchRecentFilings()` — the LDA list endpoint's first page,
 * 25 of ~28,000 filings a quarter — and keyword-matches those 25 rows against a
 * committee's jurisdiction. Seven surfaces call it: four MCP tools, the
 * representative lobbying route, the graph committee hydrator, and (through its
 * own sample path) the lobbying pipeline analyzer. All of them were reporting
 * spending totals and organization rankings computed from about 0.09% of the
 * record.
 *
 * This reads the committed corpus instead, where committee attribution is
 * already resolved at build time by the same entity resolver the aggregates use.
 *
 * Shape note: the corpus holds 87,148 filings for the busiest committee, and a
 * representative sits on several. Returning every row cost 123 MB of heap across
 * four committees in measurement, so the walk aggregates as it streams and the
 * raw `filings` list is capped. Everything a caller needs to compute is here
 * exactly — totals, company rollups, issue counts and quarter totals are
 * computed over every filing, not over the capped list.
 *
 * Returns null — never a sample — when the corpus is unavailable. A caller that
 * still falls back to the API must label that result a sample.
 */

import {
  forEachFilingForCommittees,
  getFilingCorpusCommittees,
  getFilingCorpusMeta,
} from './load-filings';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import logger from '@/lib/logging/simple-logger';
import type { CommitteeLobbyingData } from '@/lib/data-sources/senate-lobbying-api';

/** Confidence for a request naming a corpus committee code outright. */
const CODE_MATCH_CONFIDENCE = 0.95;

/** Confidence for a name or topic resolved through the committee mappings. */
const NAME_MATCH_CONFIDENCE = 0.85;

/** Company rollups returned per committee. The deepest consumer shows 20. */
const MAX_COMPANIES = 200;

/** Individual rows returned per committee. The deepest consumer shows 5. */
const MAX_FILINGS = 100;

/**
 * How large the row buffer may grow before it is sorted back down to
 * MAX_FILINGS. Collecting all 87,148 rows of the busiest committee and sorting
 * once measured 212 MB of heap; pruning keeps it flat for the same result.
 */
const ROW_BUFFER_LIMIT = MAX_FILINGS * 10;

/** Corpus quarter suffix → the LDA's own filing-period vocabulary. */
const PERIOD_BY_QUARTER: Record<string, string> = {
  Q1: 'first_quarter',
  Q2: 'second_quarter',
  Q3: 'third_quarter',
  Q4: 'fourth_quarter',
};

interface ResolvedCommittee {
  /** The string the caller asked for, echoed back as `committee`. */
  requested: string;
  code: string;
  confidence: number;
}

/**
 * Resolve a caller's committee string to a corpus committee code.
 *
 * Callers pass three different things: a corpus code from the graph hydrator
 * ("HSWM"), a full committee name from the representative route ("Committee on
 * Ways and Means"), and a bare topic from the MCP tools ("Energy", "Banking").
 * Codes are checked first because they are unambiguous; everything else goes
 * through the same bidirectional substring match the analyzers use, so "Energy"
 * reaches "Energy and Commerce".
 */
function resolveCommittee(
  requested: string,
  corpusCommittees: Map<string, string>
): ResolvedCommittee | null {
  const trimmed = requested.trim();
  if (!trimmed) return null;

  if (corpusCommittees.has(trimmed)) {
    return { requested, code: trimmed, confidence: CODE_MATCH_CONFIDENCE };
  }

  const normalized = trimmed.toLowerCase();
  const match = ALL_COMMITTEE_MAPPINGS.find(m => {
    const name = m.committeeName.toLowerCase();
    return normalized.includes(name) || name.includes(normalized);
  });

  if (!match || !corpusCommittees.has(match.committeeCode)) return null;
  return { requested, code: match.committeeCode, confidence: NAME_MATCH_CONFIDENCE };
}

/** Mutable accumulator for one company's activity on one committee. */
interface CompanyAccumulator {
  name: string;
  registrantId: string;
  totalSpending: number;
  filingCount: number;
  issueCodes: Set<string>;
  earliestQuarter: string;
  latestQuarter: string;
}

/**
 * Roll the corpus up for one committee code. Streams the committee's filings,
 * accumulating exact totals, and keeps only the largest rows.
 */
async function rollUpCommittee(
  { requested, code, confidence }: ResolvedCommittee,
  corpusCommittees: Map<string, string>
): Promise<CommitteeLobbyingData | null | 'unavailable'> {
  const companies = new Map<string, CompanyAccumulator>();
  const issueFilingCounts: Record<string, number> = {};
  const quarterTotals: Record<string, number> = {};
  const rows: CommitteeLobbyingData['filings'] = [];
  let totalSpending = 0;
  let filingCount = 0;

  const available = await forEachFilingForCommittees([code], filing => {
    const [year, quarter] = filing.quarter.split('-');
    totalSpending += filing.amount;
    filingCount += 1;
    quarterTotals[filing.quarter] = (quarterTotals[filing.quarter] ?? 0) + filing.amount;

    let company = companies.get(filing.clientName);
    if (!company) {
      company = {
        name: filing.clientName,
        registrantId: filing.registrantId,
        totalSpending: 0,
        filingCount: 0,
        issueCodes: new Set(),
        earliestQuarter: filing.quarter,
        latestQuarter: filing.quarter,
      };
      companies.set(filing.clientName, company);
    }
    company.totalSpending += filing.amount;
    company.filingCount += 1;
    if (filing.quarter < company.earliestQuarter) company.earliestQuarter = filing.quarter;
    if (filing.quarter > company.latestQuarter) company.latestQuarter = filing.quarter;

    for (const issue of filing.issueCodes) {
      company.issueCodes.add(issue);
      issueFilingCounts[issue] = (issueFilingCounts[issue] ?? 0) + 1;
    }

    rows.push({
      // The corpus drops filing UUIDs — 155k high-entropy strings would have
      // tripled the artifact. Rows are deduped on registrant+client+period, so
      // that triple is a stable identity for callers that key on `id`. It is
      // not an LDA UUID and must never be used to address lda.gov.
      id: `${filing.registrantId}|${filing.clientName}|${filing.quarter}`,
      company: filing.clientName,
      registrantId: filing.registrantId,
      amount: filing.amount,
      issues: filing.issueCodes,
      quarter: PERIOD_BY_QUARTER[quarter ?? ''] ?? filing.quarter,
      year: Number(year) || 0,
    });

    if (rows.length >= ROW_BUFFER_LIMIT) {
      rows.sort((a, b) => b.amount - a.amount);
      rows.length = MAX_FILINGS;
    }
  });

  if (!available) return 'unavailable';
  if (filingCount === 0) return null;

  return {
    committee: requested,
    committeeCode: code,
    committeeName: corpusCommittees.get(code) ?? requested,
    totalSpending,
    companyCount: companies.size,
    filingCount,
    matchingMethod: 'corpus',
    matchConfidence: confidence,
    coverage: 'complete',
    companies: Array.from(companies.values())
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, MAX_COMPANIES)
      .map(c => ({
        name: c.name,
        registrantId: c.registrantId,
        totalSpending: c.totalSpending,
        filingCount: c.filingCount,
        issueCodes: Array.from(c.issueCodes),
        earliestQuarter: c.earliestQuarter,
        latestQuarter: c.latestQuarter,
      })),
    issueFilingCounts,
    quarterTotals,
    filings: rows.sort((a, b) => b.amount - a.amount).slice(0, MAX_FILINGS),
  };
}

/**
 * Roll the corpus up per requested committee.
 *
 * Returns null when the corpus is unavailable so callers can degrade
 * deliberately. An empty array means the corpus loaded and none of the requested
 * committees resolved or carried filings — a real answer, not a failure.
 */
export async function getCommitteeLobbyingFromCorpus(
  committees: string[]
): Promise<CommitteeLobbyingData[] | null> {
  const corpusCommittees = await getFilingCorpusCommittees();
  if (!corpusCommittees) return null;

  const resolved: ResolvedCommittee[] = [];
  const unresolved: string[] = [];
  const seenCodes = new Set<string>();

  for (const requested of committees) {
    const hit = resolveCommittee(requested, corpusCommittees);
    if (!hit) {
      unresolved.push(requested);
      continue;
    }
    // Several requested topics can land on the same committee ("Energy" and
    // "Energy and Commerce"); rolling it up twice would double its spending.
    if (seenCodes.has(hit.code)) continue;
    seenCodes.add(hit.code);
    resolved.push(hit);
  }

  if (unresolved.length > 0) {
    logger.info('[LdaCommitteeLobbying] Committees not in the corpus', { unresolved });
  }
  if (resolved.length === 0) return [];

  const results: CommitteeLobbyingData[] = [];
  for (const committee of resolved) {
    const rolled = await rollUpCommittee(committee, corpusCommittees);
    if (rolled === 'unavailable') return null;
    if (rolled) results.push(rolled);
  }

  return results.sort((a, b) => b.totalSpending - a.totalSpending);
}

/** One member's lobbying picture across every committee they sit on. */
export interface MemberLobbyingRollup {
  /** Spending across the member's committees, each filing counted once. */
  totalSpending: number;
  /** Distinct filings touching any of the member's committees. */
  filingCount: number;
  /** Distinct organizations behind them. */
  companyCount: number;
  topCompanies: Array<{
    name: string;
    registrantId: string | null;
    totalSpending: number;
    filingCount: number;
    committees: string[];
  }>;
  committeeBreakdown: Array<{
    committee: string;
    committeeCode: string;
    /** Filing amounts split evenly across the member's committees they touch. */
    attributedSpending: number;
    companyCount: number;
    filingCount: number;
    topIssues: string[];
  }>;
  /** Quarter key ("2026-Q1") → spending, each filing counted once. */
  quarterTotals: Record<string, number>;
  /** Issue code → filings disclosing it, each filing counted once. */
  issueFilingCounts: Record<string, number>;
  /** Quarter keys the corpus covers, so a caller does not plot quarters it lacks. */
  quarters: string[];
}

/** Organizations returned in a member rollup. The profile tab shows 10. */
const MAX_MEMBER_COMPANIES = 25;

/**
 * Roll the corpus up for one member's committee assignments.
 *
 * Separate from `getCommitteeLobbyingFromCorpus` because of double counting: a
 * filing that discloses both Ways and Means and Finance belongs to each
 * committee's own total, but must be counted once in the member's. This walks
 * the union of the member's committees, where the reader already visits a
 * multi-committee filing exactly once, and splits each amount across the
 * member's committees it actually touches.
 *
 * Returns null when the corpus is unavailable.
 */
export async function getMemberLobbyingFromCorpus(
  committees: string[]
): Promise<MemberLobbyingRollup | null> {
  const corpusCommittees = await getFilingCorpusCommittees();
  if (!corpusCommittees) return null;

  const codeToRequested = new Map<string, string>();
  for (const requested of committees) {
    const hit = resolveCommittee(requested, corpusCommittees);
    if (hit && !codeToRequested.has(hit.code)) codeToRequested.set(hit.code, hit.requested);
  }
  if (codeToRequested.size === 0) return null;

  const companies = new Map<
    string,
    {
      registrantId: string | null;
      totalSpending: number;
      filingCount: number;
      committees: Set<string>;
    }
  >();
  const perCommittee = new Map<
    string,
    { attributedSpending: number; companies: Set<string>; filingCount: number; issues: Set<string> }
  >();
  const quarterTotals: Record<string, number> = {};
  const issueFilingCounts: Record<string, number> = {};
  let totalSpending = 0;
  let filingCount = 0;

  const available = await forEachFilingForCommittees([...codeToRequested.keys()], filing => {
    const matched = filing.committeeCodes.filter(c => codeToRequested.has(c));
    if (matched.length === 0) return;

    totalSpending += filing.amount;
    filingCount += 1;
    quarterTotals[filing.quarter] = (quarterTotals[filing.quarter] ?? 0) + filing.amount;
    for (const issue of filing.issueCodes) {
      issueFilingCounts[issue] = (issueFilingCounts[issue] ?? 0) + 1;
    }

    let company = companies.get(filing.clientName);
    if (!company) {
      company = {
        registrantId: filing.registrantId || null,
        totalSpending: 0,
        filingCount: 0,
        committees: new Set(),
      };
      companies.set(filing.clientName, company);
    }
    company.totalSpending += filing.amount;
    company.filingCount += 1;
    if (!company.registrantId && filing.registrantId) company.registrantId = filing.registrantId;

    const share = filing.amount / matched.length;
    for (const code of matched) {
      const requested = codeToRequested.get(code)!;
      company.committees.add(requested);

      let bucket = perCommittee.get(code);
      if (!bucket) {
        bucket = {
          attributedSpending: 0,
          companies: new Set(),
          filingCount: 0,
          issues: new Set(),
        };
        perCommittee.set(code, bucket);
      }
      bucket.attributedSpending += share;
      bucket.companies.add(filing.clientName);
      bucket.filingCount += 1;
      for (const issue of filing.issueCodes) bucket.issues.add(issue);
    }
  });

  if (!available) return null;
  if (filingCount === 0) return null;

  const meta = await getFilingCorpusMeta();

  return {
    totalSpending,
    filingCount,
    companyCount: companies.size,
    topCompanies: Array.from(companies.entries())
      .sort(([, a], [, b]) => b.totalSpending - a.totalSpending)
      .slice(0, MAX_MEMBER_COMPANIES)
      .map(([name, c]) => ({
        name,
        registrantId: c.registrantId,
        totalSpending: c.totalSpending,
        filingCount: c.filingCount,
        committees: Array.from(c.committees),
      })),
    committeeBreakdown: Array.from(perCommittee.entries())
      .map(([code, bucket]) => ({
        committee: codeToRequested.get(code)!,
        committeeCode: code,
        attributedSpending: bucket.attributedSpending,
        companyCount: bucket.companies.size,
        filingCount: bucket.filingCount,
        topIssues: Array.from(bucket.issues).slice(0, 5),
      }))
      .sort((a, b) => b.attributedSpending - a.attributedSpending),
    quarterTotals,
    issueFilingCounts,
    quarters: meta?.quarters ?? Object.keys(quarterTotals).sort(),
  };
}

/**
 * A one-line statement of what the lobbying numbers cover, built from the
 * corpus's own metadata rather than hardcoded. Machine-facing surfaces send this
 * alongside the figures so an agent reading raw JSON knows whether it is holding
 * the complete record or nothing at all.
 */
export async function describeCorpusCoverage(): Promise<string> {
  const meta = await getFilingCorpusMeta();
  if (!meta) {
    return 'Lobbying data unavailable — the complete Senate LDA corpus could not be read, and the API sample it would otherwise fall back to is about 0.09% of filings and cannot be aggregated.';
  }
  const first = meta.quarters[0];
  const last = meta.quarters[meta.quarters.length - 1];
  return `COMPLETE — all ${meta.rows.toLocaleString()} Senate LDA quarterly reports (LD-2) from ${first} through ${last}, deduped so the latest amendment supersedes the original. Totals and rankings are safe to compute.`;
}

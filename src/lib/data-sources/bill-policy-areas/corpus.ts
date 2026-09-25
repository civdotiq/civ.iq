/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill → policy-area corpus (PLAN-bill-policy-area-corpus.md).
 *
 * Congress.gov's `/v3/bill` list never returns `policyArea`, and the API has no
 * policy-area filter, so "bills in a policy area" cannot be answered live. The
 * source is GovInfo BILLSTATUS bulk data: one XML per bill, free, no key, each
 * carrying the CRS-assigned `<policyArea>`.
 *
 * Scope is bills and joint resolutions (hr, s, hjres, sjres) — the measures that
 * can become law. Simple and concurrent resolutions are out.
 *
 * Encoding: policy area is dictionary-encoded (32 distinct values across
 * ~16k rows). Bills CRS has not yet assigned an area are not stored; the build
 * counts them in `meta.unassigned` instead.
 *
 * Shape and decoder only, no imports, so the request-time reader does not pull
 * the build-time XML parser. The builder lives in build.ts.
 */

/** Bill types in scope, lowercase as they appear in bill ids and GovInfo paths. */
export const CORPUS_BILL_TYPES = ['hr', 's', 'hjres', 'sjres'] as const;
export type CorpusBillType = (typeof CORPUS_BILL_TYPES)[number];

/**
 * Every BILLSTATUS collection type: the corpus types plus simple and concurrent
 * resolutions. The parser accepts all of them so the member sponsored-counts
 * build (which counts resolutions, as the Record Card does) shares one pass.
 */
export const BILLSTATUS_TYPES = [
  ...CORPUS_BILL_TYPES,
  'hres',
  'sres',
  'hconres',
  'sconres',
] as const;
export type BillStatusType = (typeof BILLSTATUS_TYPES)[number];

/**
 * One encoded bill. Slots, in order:
 *
 *   0  type              — lowercase, one of CORPUS_BILL_TYPES
 *   1  number
 *   2  title
 *   3  policyAreaIdx     — index into `policyAreas`
 *   4  introducedDate    — YYYY-MM-DD
 *   5  latestActionDate  — YYYY-MM-DD, '' when upstream has none
 *   6  latestActionText  — '' when upstream has none
 */
export type EncodedBillRow = [CorpusBillType, number, string, number, string, string, string];

export interface BillPolicyAreaCorpusFile {
  generatedAt: string;
  congress: number;
  policyAreas: string[];
  rows: EncodedBillRow[];
  meta: {
    /** Bills parsed per type, including those without a policy area. */
    parsed: Record<CorpusBillType, number>;
    /** Bills CRS has not assigned a policy area yet (not stored as rows). */
    unassigned: number;
    sources: string[];
  };
}

export interface CorpusBill {
  /** Canonical app bill id, e.g. "119-hr-1". */
  id: string;
  congress: number;
  type: CorpusBillType;
  number: number;
  title: string;
  policyArea: string;
  introducedDate: string;
  latestActionDate: string | null;
  latestActionText: string | null;
}

export function decodeBillRow(file: BillPolicyAreaCorpusFile, row: EncodedBillRow): CorpusBill {
  const [type, number, title, areaIdx, introducedDate, latestActionDate, latestActionText] = row;
  return {
    id: `${file.congress}-${type}-${number}`,
    congress: file.congress,
    type,
    number,
    title,
    policyArea: file.policyAreas[areaIdx] ?? '',
    introducedDate,
    latestActionDate: latestActionDate || null,
    latestActionText: latestActionText || null,
  };
}

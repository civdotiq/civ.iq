/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build-time half of the bill → policy-area corpus: parse one GovInfo
 * BILLSTATUS XML, and assemble parsed bills into the encoded corpus file.
 * Used by scripts/sync-bill-policy-areas.ts; never imported at request time.
 */

import { XMLParser } from 'fast-xml-parser';
import { CORPUS_BILL_TYPES } from './corpus';
import type { BillPolicyAreaCorpusFile, CorpusBillType, EncodedBillRow } from './corpus';

export interface ParsedBillStatus {
  congress: number;
  type: CorpusBillType;
  number: number;
  title: string;
  /** null until CRS assigns one, which lags introduction by weeks. */
  policyArea: string | null;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
}

// Heavy subtrees kept as raw strings rather than parsed: only direct children
// of <bill> are read, and `relatedBills` items carry their own <latestAction>
// and <title> that must not be mistaken for the bill's.
const SKIPPED = [
  'actions',
  'amendments',
  'committees',
  'committeeReports',
  'cosponsors',
  'relatedBills',
  'subjects',
  'summaries',
  'textVersions',
  'titles',
  'cboCostEstimates',
  'laws',
  'notes',
].map(tag => `billStatus.bill.${tag}`);

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  stopNodes: SKIPPED,
});

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Parse one BILLSTATUS XML. Null for out-of-scope types or malformed files. */
export function parseBillStatusXml(xml: string): ParsedBillStatus | null {
  const doc = parser.parse(xml) as {
    billStatus?: { bill?: Record<string, unknown> };
  };
  const bill = doc.billStatus?.bill;
  if (!bill) return null;

  const type = text(bill.type).toLowerCase() as CorpusBillType;
  if (!CORPUS_BILL_TYPES.includes(type)) return null;

  const number = Number(text(bill.number));
  const congress = Number(text(bill.congress));
  if (!Number.isInteger(number) || !Number.isInteger(congress)) return null;

  const area = bill.policyArea as { name?: unknown } | undefined;
  const latest = bill.latestAction as { actionDate?: unknown; text?: unknown } | undefined;

  return {
    congress,
    type,
    number,
    title: text(bill.title),
    policyArea: text(area?.name) || null,
    introducedDate: text(bill.introducedDate),
    latestActionDate: text(latest?.actionDate),
    latestActionText: text(latest?.text),
  };
}

export interface BuildInput {
  congress: number;
  bills: ParsedBillStatus[];
  generatedAt: string;
  sources: string[];
}

export function buildBillPolicyAreaCorpus(input: BuildInput): BillPolicyAreaCorpusFile {
  const parsed = Object.fromEntries(CORPUS_BILL_TYPES.map(t => [t, 0])) as Record<
    CorpusBillType,
    number
  >;
  const areaIndex = new Map<string, number>();
  const rows: EncodedBillRow[] = [];
  let unassigned = 0;

  // Stable order (type, then number) so weekly rebuilds diff cleanly.
  const sorted = [...input.bills]
    .filter(b => b.congress === input.congress)
    .sort(
      (a, b) =>
        CORPUS_BILL_TYPES.indexOf(a.type) - CORPUS_BILL_TYPES.indexOf(b.type) || a.number - b.number
    );

  for (const b of sorted) {
    parsed[b.type]++;
    if (!b.policyArea) {
      unassigned++;
      continue;
    }
    let idx = areaIndex.get(b.policyArea);
    if (idx === undefined) {
      idx = areaIndex.size;
      areaIndex.set(b.policyArea, idx);
    }
    rows.push([
      b.type,
      b.number,
      b.title,
      idx,
      b.introducedDate,
      b.latestActionDate,
      b.latestActionText,
    ]);
  }

  return {
    generatedAt: input.generatedAt,
    congress: input.congress,
    policyAreas: [...areaIndex.keys()],
    rows,
    meta: { parsed, unassigned, sources: input.sources },
  };
}

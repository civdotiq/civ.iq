/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  buildBillPolicyAreaCorpus,
  parseBillStatusXml,
} from '@/lib/data-sources/bill-policy-areas/build';
import type { ParsedBillStatus } from '@/lib/data-sources/bill-policy-areas/build';
import { decodeBillRow } from '@/lib/data-sources/bill-policy-areas/corpus';

// Trimmed from BILLSTATUS-119hjres1.xml. The relatedBills item carries its own
// title and latestAction ahead of the bill's, which the parser must skip.
function billXml(opts: { type?: string; policyArea?: string | null } = {}): string {
  const area =
    opts.policyArea === null
      ? ''
      : `<policyArea><name>${opts.policyArea ?? 'Law'}</name></policyArea>`;
  return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<billStatus>
  <version>3.0.0</version>
  <bill>
    <number>1</number>
    <type>${opts.type ?? 'HJRES'}</type>
    <introducedDate>2025-01-03</introducedDate>
    <congress>119</congress>
    <relatedBills>
      <item>
        <title>Related measure title</title>
        <congress>118</congress>
        <number>1</number>
        <type>HJRES</type>
        <latestAction>
          <actionDate>2023-01-09</actionDate>
          <text>Referred to the House Committee on the Judiciary.</text>
        </latestAction>
      </item>
    </relatedBills>
    ${area}
    <title>Proposing an amendment to the Constitution &amp; more.</title>
    <latestAction>
      <actionDate>2026-09-02</actionDate>
      <text>On motion to suspend the rules and pass the resolution Failed.</text>
    </latestAction>
  </bill>
</billStatus>`;
}

describe('parseBillStatusXml', () => {
  it('reads the bill-level fields, not a related bill’s', () => {
    expect(parseBillStatusXml(billXml())).toEqual({
      congress: 119,
      type: 'hjres',
      number: 1,
      title: 'Proposing an amendment to the Constitution & more.',
      policyArea: 'Law',
      introducedDate: '2025-01-03',
      latestActionDate: '2026-09-02',
      latestActionText: 'On motion to suspend the rules and pass the resolution Failed.',
    });
  });

  it('returns null policyArea when CRS has not assigned one', () => {
    expect(parseBillStatusXml(billXml({ policyArea: null }))?.policyArea).toBeNull();
  });

  it('drops simple and concurrent resolutions', () => {
    expect(parseBillStatusXml(billXml({ type: 'HRES' }))).toBeNull();
    expect(parseBillStatusXml(billXml({ type: 'SCONRES' }))).toBeNull();
  });

  it('returns null for a document without a bill', () => {
    expect(parseBillStatusXml('<billStatus></billStatus>')).toBeNull();
  });
});

describe('buildBillPolicyAreaCorpus', () => {
  const base: ParsedBillStatus = {
    congress: 119,
    type: 'hr',
    number: 1,
    title: 'T',
    policyArea: 'Taxation',
    introducedDate: '2025-01-03',
    latestActionDate: '2025-07-04',
    latestActionText: 'Became Public Law No: 119-21.',
  };

  it('dictionary-encodes areas, counts unassigned, and round-trips', () => {
    const corpus = buildBillPolicyAreaCorpus({
      congress: 119,
      generatedAt: '2026-09-23T00:00:00.000Z',
      sources: ['x'],
      bills: [
        { ...base, type: 's', number: 5, policyArea: 'Health' },
        { ...base, number: 2 },
        { ...base, number: 3, policyArea: null },
        { ...base, congress: 118, number: 9 },
      ],
    });

    expect(corpus.rows).toHaveLength(2);
    expect(corpus.policyAreas).toEqual(['Taxation', 'Health']);
    expect(corpus.meta.unassigned).toBe(1);
    expect(corpus.meta.parsed).toEqual({ hr: 2, s: 1, hjres: 0, sjres: 0 });
    // Sorted hr before s regardless of input order.
    expect(decodeBillRow(corpus, corpus.rows[0]!)).toMatchObject({
      id: '119-hr-2',
      policyArea: 'Taxation',
    });
    expect(decodeBillRow(corpus, corpus.rows[1]!)).toMatchObject({
      id: '119-s-5',
      policyArea: 'Health',
    });
  });
});

describe('getBillsByPolicyArea (committed corpus)', () => {
  // Imported lazily so the parser tests above don't pay for the corpus read.
  const load = () => import('@/lib/data-sources/bill-policy-areas/load');

  it('returns the full area count, capped rows, most recent action first', async () => {
    const { getBillsByPolicyArea } = await load();
    const result = await getBillsByPolicyArea('health', 5);

    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(1000);
    expect(result!.bills).toHaveLength(5);
    const dates = result!.bills.map(b => b.latestActionDate ?? b.introducedDate);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(result!.bills.every(b => b.policyArea === 'Health')).toBe(true);
  });

  it('returns an empty list, not null, for an area with no bills', async () => {
    const { getBillsByPolicyArea } = await load();
    const result = await getBillsByPolicyArea('Not A Policy Area', 5);
    expect(result).toMatchObject({ total: 0, bills: [] });
  });
});

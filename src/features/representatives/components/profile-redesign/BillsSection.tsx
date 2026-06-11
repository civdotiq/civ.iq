/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { BillLink } from '@/components/shared/links/EntityLinks';
import type { BillsResponse } from '../BillsTab';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';
import type { ProfileSummary } from './types';

type SponsoredBill = BillsResponse['sponsored']['bills'][number];

interface BillsSectionProps {
  bills: BillsResponse | undefined;
  summary: ProfileSummary | null;
  loading: boolean;
  onExplore: () => void;
}

const VISIBLE_BILLS = 3;

/** Citation prefixes for Congress.gov bill type codes. */
const BILL_TYPE_LABELS: Record<string, string> = {
  hr: 'H.R.',
  s: 'S.',
  hres: 'H.Res.',
  sres: 'S.Res.',
  hjres: 'H.J.Res.',
  sjres: 'S.J.Res.',
  hconres: 'H.Con.Res.',
  sconres: 'S.Con.Res.',
};

/** Canonical bill slug (<congress>-<type>-<number>), same scheme as BillsTab. */
function billSlug(bill: SponsoredBill): string | null {
  if (!bill.type || !bill.number) return null;
  const cleanType = bill.type.toLowerCase().replace(/\./g, '');
  const cleanNumber = bill.number.match(/\d+/)?.[0];
  if (!cleanNumber) return null;
  return `${bill.congress || 119}-${cleanType}-${cleanNumber}`;
}

/** Display citation, e.g. "H.R. 9206". */
function billCitation(bill: SponsoredBill): string {
  const cleanType = (bill.type ?? '').toLowerCase().replace(/\./g, '');
  const prefix = BILL_TYPE_LABELS[cleanType] ?? bill.type ?? '';
  return `${prefix} ${bill.number}`.trim();
}

function formatIntroduced(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BillRow({ bill }: { bill: SponsoredBill }) {
  const slug = billSlug(bill);
  const latestAction = bill.lastAction || bill.status;
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-4 py-4 border-b border-gray-300 first:pt-0 last:border-b-0 last:pb-0 text-sm">
      <span className="font-bold text-gray-900">
        <BillLink billId={slug} title={billCitation(bill)} />
      </span>
      <div>
        <BillLink billId={slug} title={bill.title} className="font-medium" />
        <p className="text-xs text-gray-500 mt-0.5">
          Introduced {formatIntroduced(bill.introducedDate)}
          {bill.policyArea ? ` · ${bill.policyArea}` : ''}
          {latestAction ? ` · ${latestAction}` : ''}
        </p>
      </div>
    </div>
  );
}

export function BillsSection({ bills, summary, loading, onExplore }: BillsSectionProps) {
  const sponsored = bills?.sponsored?.bills ?? [];
  const visible = sponsored.slice(0, VISIBLE_BILLS);
  const sponsoredCount = summary?.billsSponsored ?? bills?.totalSponsored ?? sponsored.length;
  const cosponsoredCount = summary?.billsCosponsored ?? bills?.totalCosponsored ?? 0;

  const actionLabel =
    sponsoredCount > 0
      ? `All ${sponsoredCount} sponsored${cosponsoredCount > 0 ? ` · ${cosponsoredCount} cosponsored` : ''} →`
      : 'All legislation →';

  return (
    <SectionBlock
      id="bills"
      title="Sponsored bills"
      action={
        <button type="button" onClick={onExplore} className="text-civiq-blue hover:underline">
          {actionLabel}
        </button>
      }
      source="Source: Congress.gov · 119th Congress"
    >
      {loading ? (
        <SectionSkeleton rows={3} />
      ) : visible.length === 0 ? (
        <SectionEmptyState message="No sponsored bills found for this member in the 119th Congress." />
      ) : (
        <div>
          {visible.map(bill => (
            <BillRow key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </SectionBlock>
  );
}

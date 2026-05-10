/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award detail redesigned page (PR 18). Reduced-scope per
 * 2026-05-10 decisions:
 * - "Authorizing law" panel cut (no program-to-public-law data)
 * - Recipient meta lines (CEO / Founded / "Closely held") render "—"
 *   when missing — never fabricated
 * - Period-of-performance band is date-only inline SVG
 * - Modifications and peer awards pull from real USASpending
 *   transaction / search endpoints; no fake rows
 *
 * TODO (post-PR-18): when a curated program → P.L. mapping lands,
 * restore the authorizing-law card alongside RelatedAwardsAside.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { CqBar } from '@/components/cq/CqBar';
import { AwardHero } from './AwardHero';
import { ObligationSchedule } from './ObligationSchedule';
import { PartyCard, type PartyCardMetaRow } from './PartyCard';
import { PerformancePeriodBand } from './PerformancePeriodBand';
import { RelatedAwardsAside } from './RelatedAwardsAside';
import {
  buildModificationRows,
  formatCompactDollars,
  formatDateLong,
  isGovernmentRecipient,
  locationLine,
  periodElapsedPct,
  progressPct,
  recipientStripeVar,
  titleCase,
} from './data';
import type { AwardDetailPayload, AwardRelatedPayload, AwardTransactionsPayload } from './types';

interface SpendingContractPageProps {
  awardId: string;
}

interface FetchResult<T> {
  data: T | null;
  unavailable: boolean;
}

async function fetcher<T>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url);
  if (res.status === 404) return { data: null, unavailable: true };
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return { data: (await res.json()) as T, unavailable: false };
}

export function SpendingContractPage({ awardId }: SpendingContractPageProps) {
  const encodedId = encodeURIComponent(awardId);

  const { data: detailResult, isLoading: detailLoading } = useSWR<FetchResult<AwardDetailPayload>>(
    `award:detail:${awardId}`,
    () => fetcher<AwardDetailPayload>(`/api/spending/awards/${encodedId}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: txnResult, isLoading: txnLoading } = useSWR<FetchResult<AwardTransactionsPayload>>(
    `award:txn:${awardId}`,
    () => fetcher<AwardTransactionsPayload>(`/api/spending/awards/${encodedId}/transactions`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const award = detailResult?.data?.award ?? null;
  const detailUnavailable = detailResult?.unavailable ?? false;

  const recipientUei = award?.recipient.recipient_uei ?? null;
  const awardingAgency = award?.awarding_agency.toptier_agency.name ?? null;

  const relatedKey =
    recipientUei && awardingAgency ? `award:related:${awardId}:${recipientUei}` : null;
  const { data: relatedResult, isLoading: relatedLoading } = useSWR<
    FetchResult<AwardRelatedPayload>
  >(
    relatedKey,
    () =>
      fetcher<AwardRelatedPayload>(
        `/api/spending/awards/${encodedId}/related?uei=${encodeURIComponent(recipientUei!)}&agency=${encodeURIComponent(awardingAgency!)}`
      ),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const transactions = txnResult?.data?.transactions ?? [];
  const totalTxnCount = txnResult?.data?.totalCount ?? 0;
  const truncatedTxns = txnResult?.data?.truncated ?? false;
  const modRows = buildModificationRows(transactions);
  const cumulativeFromTxns = modRows.length > 0 ? modRows[modRows.length - 1]!.cumulative : 0;

  const obligated = award?.total_obligation ?? cumulativeFromTxns;
  const ceiling = award?.base_and_all_options ?? award?.base_exercised_options ?? 0;
  const pct = progressPct(obligated, ceiling);

  const dataAsOf =
    detailResult?.data?.dataAsOf ??
    txnResult?.data?.dataAsOf ??
    relatedResult?.data?.dataAsOf ??
    new Date().toISOString();
  const asOfReadable = formatDateLong(dataAsOf);

  if (detailUnavailable && !detailLoading) {
    return (
      <div
        style={{
          background: 'var(--bg1)',
          color: 'var(--fg1)',
          fontFamily: 'var(--font-primary)',
          padding: '64px 36px',
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <CqLabel>Federal spending · Award detail</CqLabel>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.0,
            margin: '12px 0 16px',
            textTransform: 'uppercase',
          }}
        >
          Award not found
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--fg2)',
            margin: '0 auto 24px',
            maxWidth: 520,
          }}
        >
          USASpending does not have a record for <code>{awardId}</code>.
        </p>
        <Link
          href="/spending"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            border: '2px solid var(--ink)',
            background: 'var(--ink)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: 'var(--radius-interactive)',
          }}
        >
          District spending →
        </Link>
      </div>
    );
  }

  const recipientStripe = recipientStripeVar(award);
  const recipientIsGov = award ? isGovernmentRecipient(award) : false;

  const awarderMeta = buildAwarderMeta(award);
  const recipientMeta = buildRecipientMeta(award);
  const popPct = periodElapsedPct(
    award?.period_of_performance.start_date,
    award?.period_of_performance.end_date
  );

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Top rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/spending"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All federal spending
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <CqSourceTag compact source="USASpending.gov" id={`award ${awardId}`} />
        </div>
      </div>

      {/* Crumb-line context */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <CqLabel>Federal spending · Award detail</CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          As of {asOfReadable}
        </span>
      </div>

      <AwardHero award={award} loading={detailLoading} awardId={awardId} />

      {/* Parties */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr',
          border: '2px solid var(--ink)',
          marginBottom: 32,
          background: 'var(--bg1)',
        }}
      >
        <PartyCard
          eyebrow="Awarding agency"
          name={
            award?.awarding_agency.toptier_agency.name ??
            (detailLoading ? '' : 'Agency unavailable')
          }
          short={composeAgencyShort(award)}
          meta={awarderMeta}
          accent="var(--civiq-blue)"
          loading={detailLoading && !award}
        />
        <div
          style={{
            background: 'var(--ink)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            padding: '20px 0',
            borderLeft: '1px solid var(--line)',
            borderRight: '1px solid var(--line)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#9ca3af',
              letterSpacing: '0.12em',
            }}
          >
            OBLIGATES
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            →
          </span>
        </div>
        <PartyCard
          eyebrow={
            recipientIsGov ? 'Recipient · government entity' : 'Recipient · prime contractor'
          }
          name={award?.recipient.recipient_name ?? (detailLoading ? '' : 'Recipient unavailable')}
          short={composeRecipientShort(award)}
          meta={recipientMeta}
          accent={recipientStripe}
          loading={detailLoading && !award}
        />
      </div>

      {/* Period-of-performance band */}
      <div
        style={{
          border: '2px solid var(--ink)',
          padding: '20px 24px',
          marginBottom: 32,
          background: 'var(--bg1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <CqLabel>Period of performance</CqLabel>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Last modified {formatDateLong(award?.period_of_performance.last_modified_date)}
          </span>
        </div>
        <div style={{ height: 96 }}>
          <PerformancePeriodBand
            start={award?.period_of_performance.start_date ?? null}
            end={award?.period_of_performance.end_date ?? null}
            potentialEnd={award?.period_of_performance.potential_end_date ?? null}
          />
        </div>
      </div>

      {/* Body grid: schedule + related */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>
        <div>
          <ObligationSchedule
            rows={modRows}
            transactions={transactions}
            loading={txnLoading}
            totalCount={totalTxnCount}
            truncated={truncatedTxns}
            awardId={awardId}
          />

          {/* Progress bar against ceiling */}
          <div style={{ marginTop: 28 }}>
            <CqBar
              label="Obligated against ceiling"
              pct={pct}
              amount={`${formatCompactDollars(obligated)} / ${formatCompactDollars(ceiling)}`}
              color="blue"
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <CqPlainReading>
              {plainReading({
                award,
                obligated,
                ceiling,
                pct,
                modCount: totalTxnCount,
                popPct,
              })}
            </CqPlainReading>
          </div>
        </div>

        <RelatedAwardsAside
          related={relatedResult?.data?.related ?? []}
          loading={relatedLoading || (!!relatedKey && !relatedResult)}
        />
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.97}
          asof={asOfReadable}
          method="Direct ingestion · USASpending /awards/{id}/ + spending_by_transaction + spending_by_award"
        >
          {' '}
          Award amounts reflect federal obligations as recorded in FPDS-NG / FABS via USASpending.
          Subcontracts and pass-through awards are NOT aggregated in this view. Recipient executive
          fields (officer names, founding year) are not provided by USASpending and render as
          &mdash;.
        </CqDisclaimer>
      </div>
    </div>
  );
}

function composeAgencyShort(award: NonNullable<AwardDetailPayload['award']> | null): string {
  if (!award) return '';
  const top = award.awarding_agency.toptier_agency.abbreviation ?? '';
  const office = award.awarding_agency.office_agency_name ?? '';
  if (top && office) return `${top} · ${titleCase(office)}`;
  if (top) return top;
  if (office) return titleCase(office);
  return '—';
}

function composeRecipientShort(award: NonNullable<AwardDetailPayload['award']> | null): string {
  if (!award) return '';
  const loc = award.recipient.location;
  const city = loc?.city_name ? titleCase(loc.city_name) : null;
  const state = loc?.state_code ?? null;
  const uei = award.recipient.recipient_uei ?? null;
  const left = city && state ? `${city}, ${state}` : (state ?? city ?? '—');
  return uei ? `${left} · UEI ${uei}` : left;
}

function buildAwarderMeta(
  award: NonNullable<AwardDetailPayload['award']> | null
): PartyCardMetaRow[] {
  if (!award) {
    return [
      { key: 'CODE', value: '' },
      { key: 'SUBAGENCY', value: '' },
      { key: 'OFFICE', value: '' },
      { key: 'PERFORMANCE', value: '' },
    ];
  }
  return [
    { key: 'CODE', value: award.awarding_agency.toptier_agency.code ?? '' },
    { key: 'SUBAGENCY', value: award.awarding_agency.subtier_agency?.name ?? '' },
    {
      key: 'OFFICE',
      value: award.awarding_agency.office_agency_name
        ? titleCase(award.awarding_agency.office_agency_name)
        : '',
    },
    { key: 'PERFORMANCE', value: locationLine(award.place_of_performance) },
  ];
}

function buildRecipientMeta(
  award: NonNullable<AwardDetailPayload['award']> | null
): PartyCardMetaRow[] {
  if (!award) {
    return [
      { key: 'UEI', value: '' },
      { key: 'PARENT', value: '' },
      { key: 'TYPE', value: '' },
      { key: 'LOCATION', value: '' },
    ];
  }
  const cats = award.recipient.business_categories ?? [];
  return [
    { key: 'UEI', value: award.recipient.recipient_uei ?? '' },
    { key: 'PARENT', value: award.recipient.parent_recipient_name ?? '' },
    { key: 'TYPE', value: cats[0] ?? '' },
    { key: 'LOCATION', value: locationLine(award.recipient.location) },
  ];
}

function plainReading({
  award,
  obligated,
  ceiling,
  pct,
  modCount,
  popPct,
}: {
  award: NonNullable<AwardDetailPayload['award']> | null;
  obligated: number;
  ceiling: number;
  pct: number;
  modCount: number;
  popPct: number;
}): string {
  if (!award) {
    return 'Loading award detail, transactions, and peer awards from USASpending…';
  }
  const recipient = award.recipient.recipient_name ?? 'The recipient';
  const agency = award.awarding_agency.toptier_agency.name ?? 'A federal agency';
  const ceilingText = ceiling > 0 ? formatCompactDollars(ceiling) : '—';
  const obligatedText = obligated > 0 ? formatCompactDollars(obligated) : '—';
  const pctText = ceiling > 0 ? ` (${pct}% of ceiling)` : '';
  const popFragment =
    popPct > 0 && popPct < 100 ? ` ${popPct}% of the period of performance has elapsed.` : '';
  const modFragment =
    modCount > 0
      ? ` Funded across ${modCount} obligation modification${modCount === 1 ? '' : 's'}.`
      : '';
  return `${agency} obligated ${obligatedText} of a ${ceilingText} ceiling${pctText} to ${recipient}.${modFragment}${popFragment}`;
}

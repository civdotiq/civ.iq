/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import {
  CqChip,
  CqDisclaimer,
  CqLabel,
  CqPlainReading,
  CqSourceTag,
  CqStat,
} from '@/components/cq';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import type { FECFilingDetailData, Party } from './types';

interface FECFilingDetailProps {
  data: FECFilingDetailData;
}

function formatCompactDollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

function formatExactDollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodLabel(data: FECFilingDetailData): string {
  if (data.reportType && data.reportYear) return `${data.reportType} ${data.reportYear}`;
  if (data.reportYear) return String(data.reportYear);
  return data.reportTypeFull ?? '—';
}

function periodDates(data: FECFilingDetailData): string {
  if (data.coverageStart && data.coverageEnd) {
    return `${formatDate(data.coverageStart)} – ${formatDate(data.coverageEnd)}`;
  }
  return periodLabel(data);
}

function partyChipVariant(party: Party): 'd' | 'r' | 'i' | 'ink' {
  if (party === 'D') return 'd';
  if (party === 'R') return 'r';
  if (party === 'I') return 'i';
  return 'ink';
}

function partyLabel(party: Party): string {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  if (party === 'I') return 'Independent';
  return 'Non-partisan';
}

function plainReading(data: FECFilingDetailData): string {
  const period = periodLabel(data);
  const millionsRaised =
    data.totalReceipts >= 1e6
      ? `$${(data.totalReceipts / 1e6).toFixed(2)}M`
      : formatCompactDollars(data.totalReceipts);
  const smallPct =
    data.totalReceipts > 0
      ? Math.round((data.contributionsUnitemized / data.totalReceipts) * 100)
      : 0;
  if (data.totalReceipts === 0 && data.totalDisbursements === 0) {
    return `${data.committeeName} filed FEC Form ${data.formType} for ${period} with zero receipts and zero disbursements on record.`;
  }
  const smallDonorPart =
    smallPct > 0 ? ` Small donors (under $200) supplied about ${smallPct}%.` : '';
  return `${data.committeeName} reported ${millionsRaised} raised in ${period}, with ${formatCompactDollars(data.totalDisbursements)} spent and ${formatCompactDollars(data.cashOnHandEnd)} cash on hand at period close.${smallDonorPart}`;
}

function FlowBox({
  label,
  value,
  accent,
  bold = false,
}: {
  label: string;
  value: string;
  accent: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        border: `2px solid ${accent}`,
        padding: '14px 16px',
        background: 'var(--bg1)',
        textAlign: 'center',
      }}
    >
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: bold ? 22 : 18,
          fontWeight: 700,
          marginTop: 6,
          fontFamily: 'var(--font-mono)',
          color: accent,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FlowArrow({ text, color, sign }: { text: string; color: string; sign: '+' | '−' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        minWidth: 96,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {sign} {text}
      </span>
      <svg
        width="80"
        height="24"
        viewBox="0 0 80 24"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <line
          x1="2"
          y1="12"
          x2="68"
          y2="12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="square"
        />
        <polyline
          points="60,5 70,12 60,19"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  );
}

function FundingPie({ slices }: { slices: FECFilingDetailData['fundingMix'] }) {
  if (slices.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        No itemized receipts on this filing.
      </div>
    );
  }
  let acc = 0;
  const total = slices.reduce((s, x) => s + x.pct, 0) || 100;
  return (
    <div style={{ position: 'relative', height: 180 }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} aria-hidden="true">
        {slices.map(slice => {
          const r = 40;
          const cx = 50;
          const cy = 50;
          const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((acc + slice.pct) / total) * Math.PI * 2 - Math.PI / 2;
          acc += slice.pct;
          const large = slice.pct > 50 ? 1 : 0;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          return (
            <path
              key={slice.label}
              d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`}
              fill={slice.color}
              stroke="var(--bg1)"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function FECFilingDetail({ data }: FECFilingDetailProps) {
  const period = periodLabel(data);
  const periodRange = periodDates(data);
  const filedOn = formatDate(data.receiptDate);
  const subtotal = data.cashOnHandBegin + data.totalReceipts;

  const sources = [
    {
      key: 'fec',
      source: 'FEC',
      id: `${data.committeeId} · ${data.formType}`,
    },
    {
      key: 'docquery',
      source: 'docquery.fec.gov',
      id: String(data.fileNumber),
    },
  ];

  const receiptCategories = [
    {
      key: 'ind-large',
      label: 'Itemized individual ($200+)',
      amount: data.contributionsIndividual,
    },
    {
      key: 'ind-small',
      label: 'Unitemized individual (<$200)',
      amount: data.contributionsUnitemized,
    },
    { key: 'pac', label: 'PAC contributions', amount: data.contributionsPac },
    { key: 'party', label: 'Party committees', amount: data.contributionsParty },
  ];
  const accountedFor = receiptCategories.reduce((s, r) => s + r.amount, 0);
  const receiptsOther = Math.max(0, data.totalReceipts - accountedFor);
  if (receiptsOther > 0) {
    receiptCategories.push({
      key: 'other',
      label: 'Other receipts (transfers, refunds, loans)',
      amount: receiptsOther,
    });
  }

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
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Money', url: 'https://civdotiq.org/topics/finance' },
          {
            name: data.committeeName,
            url: `https://civdotiq.org/finance/filings/${data.fileNumber}`,
          },
        ]}
      />

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
          href="/topics/finance"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All filings · {data.committeeId}
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {sources.map(s => (
            <CqSourceTag key={s.key} compact source={s.source} id={s.id} />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div>
          <CqLabel>
            FEC Form {data.formType} · {data.reportTypeFull ?? 'Committee report'} · {periodRange}
          </CqLabel>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            {data.committeeName}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg2)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.55,
            }}
          >
            {data.committeeType ?? 'Committee'}
            {data.candidateName ? ` · ${data.candidateName}` : ''}
            {data.candidateOffice ? ` · ${data.candidateOffice}` : ''}
            {data.treasurerName ? ` · Treasurer · ${data.treasurerName}` : ''}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {data.party !== 'O' && (
              <CqChip variant={partyChipVariant(data.party)} size="sm">
                {partyLabel(data.party)}
              </CqChip>
            )}
            <CqChip variant="ink" filled={false} size="sm">
              {data.committeeId}
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              Form {data.formType}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {period}
            </CqChip>
            {data.amended && (
              <CqChip variant="warn" filled size="sm">
                Amended
              </CqChip>
            )}
          </div>
        </div>
        <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Filing record</CqLabel>
          <ul
            style={{
              listStyle: 'none',
              margin: '10px 0 0',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            {[
              ['Form', `${data.formType} · ${data.reportType ?? 'Periodic'}`],
              ['Coverage', periodRange],
              ['Filed', filedOn],
              ['Amended', data.amended ? 'Yes' : 'No'],
              ['File number', String(data.fileNumber)],
              ['Committee', data.committeeId],
            ].map(([k, v], i) => (
              <li
                key={String(k)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--fg3)' }}>{k}</span>
                <span style={{ fontWeight: 700, color: 'var(--fg1)', textAlign: 'right' }}>
                  {v}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Summary of funds */}
      <div style={{ marginTop: 32, marginBottom: 14 }}>
        <CqLabel>Summary · this period</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          Receipts and disbursements
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          borderTop: '2px solid var(--ink)',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {[
          {
            key: 'receipts',
            label: 'Total receipts',
            value: formatCompactDollars(data.totalReceipts),
            caption: formatExactDollars(data.totalReceipts),
            color: 'green' as const,
          },
          {
            key: 'disbursements',
            label: 'Total disbursements',
            value: formatCompactDollars(data.totalDisbursements),
            caption: formatExactDollars(data.totalDisbursements),
            color: 'red' as const,
          },
          {
            key: 'cob',
            label: 'Cash on hand · begin',
            value: formatCompactDollars(data.cashOnHandBegin),
            caption: formatExactDollars(data.cashOnHandBegin),
            color: 'ink' as const,
          },
          {
            key: 'coh',
            label: 'Cash on hand · end',
            value: formatCompactDollars(data.cashOnHandEnd),
            caption: formatExactDollars(data.cashOnHandEnd),
            color: 'blue' as const,
          },
        ].map((s, i) => (
          <div
            key={s.key}
            style={{
              padding: '24px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
            }}
          >
            <CqStat label={s.label} value={s.value} caption={s.caption} color={s.color} size={28} />
          </div>
        ))}
      </div>

      {/* Cash-flow diagram */}
      <div
        style={{
          marginTop: 24,
          padding: 24,
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
        }}
      >
        <CqLabel>Cash flow · this period</CqLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: 20,
            marginTop: 16,
          }}
        >
          <FlowBox
            label="Begin balance"
            value={formatCompactDollars(data.cashOnHandBegin)}
            accent="var(--fg1)"
          />
          <FlowArrow
            text={formatCompactDollars(data.totalReceipts)}
            color="var(--civiq-green)"
            sign="+"
          />
          <FlowBox label="Subtotal" value={formatCompactDollars(subtotal)} accent="var(--fg2)" />
          <FlowArrow
            text={formatCompactDollars(data.totalDisbursements)}
            color="var(--civiq-red)"
            sign="−"
          />
          <FlowBox
            label="End balance"
            value={formatCompactDollars(data.cashOnHandEnd)}
            accent="var(--civiq-blue)"
            bold
          />
        </div>
      </div>

      {/* Body grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          marginTop: 32,
        }}
      >
        <div>
          {/* Schedule A */}
          <section>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Schedule A · Itemized receipts</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Where the money came from
              </div>
            </div>
            {data.totalReceipts === 0 ? (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                }}
              >
                No itemized receipts are reported on this filing.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 110px 110px',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '2px solid var(--ink)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {['Source', 'This period', 'Share'].map(h => (
                    <CqLabel key={h}>{h}</CqLabel>
                  ))}
                </div>
                {receiptCategories.map(r => {
                  const pct = data.totalReceipts > 0 ? (r.amount / data.totalReceipts) * 100 : 0;
                  return (
                    <div
                      key={r.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 110px 110px',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--line)',
                        alignItems: 'center',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--fg1)' }}>{r.label}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatCompactDollars(r.amount)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--fg3)',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 110px 110px',
                    gap: 12,
                    padding: '14px 0',
                    borderTop: '2px solid var(--ink)',
                    fontFamily: 'var(--font-mono)',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total receipts
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: 'right',
                      color: 'var(--civiq-green)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCompactDollars(data.totalReceipts)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--fg3)',
                      textAlign: 'right',
                    }}
                  >
                    100%
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Schedule B */}
          <section style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Schedule B · Disbursement summary</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Where the money went
              </div>
            </div>
            {data.totalDisbursements === 0 ? (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                }}
              >
                No disbursements are reported on this filing. Itemized payee detail is published as
                separate Schedule B records and is not always exposed via the periodic-summary
                endpoint.
              </div>
            ) : (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                  lineHeight: 1.55,
                }}
              >
                {data.committeeName} reported{' '}
                <strong style={{ color: 'var(--fg1)' }}>
                  {formatCompactDollars(data.totalDisbursements)}
                </strong>{' '}
                in total disbursements for {period}. Itemized payee detail (Schedule B records) is
                published as separate FEC line items — view the original filing for the line-by-line
                breakdown.
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <CqPlainReading>{plainReading(data)}</CqPlainReading>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div style={{ border: '2px solid var(--ink)', padding: 18, marginBottom: 14 }}>
            <CqLabel>Funding mix · this filing</CqLabel>
            <div style={{ marginTop: 12 }}>
              <FundingPie slices={data.fundingMix} />
            </div>
            {data.fundingMix.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
                {data.fundingMix.map(s => (
                  <li
                    key={s.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: s.color,
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ flex: 1 }}>{s.label}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {s.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            style={{
              borderLeft: data.amended
                ? '6px solid var(--color-warning)'
                : '6px solid var(--civiq-blue)',
              background: 'var(--bg2)',
              padding: '14px 16px',
            }}
          >
            <CqLabel color={data.amended ? 'amber' : 'blue'}>
              {data.amended ? 'Amended filing' : 'Filing notes'}
            </CqLabel>
            <p style={{ fontSize: 12, color: 'var(--fg2)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {data.amended
                ? 'This report supersedes a prior submission with the same coverage period. The earlier file is preserved in the FEC record but its totals are no longer authoritative.'
                : 'FEC review window for periodic reports is 60 days. Amendments are common — we refresh nightly from docquery.fec.gov, and any change will be flagged here.'}
            </p>
          </div>

          {(data.htmlUrl || data.pdfUrl) && (
            <div style={{ marginTop: 14 }}>
              {data.htmlUrl && (
                <a
                  href={data.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--civiq-blue-active)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 6,
                  }}
                >
                  View on FEC.gov →
                </a>
              )}
              {data.pdfUrl && (
                <a
                  href={data.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: 'var(--civiq-blue-active)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Original filing PDF →
                </a>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.99}
          asof={filedOn}
          method="Direct ingestion from FEC openFEC API · self-reported by filer"
        >
          {' '}
          Federal Election Commission · Form {data.formType}. Numbers are filer-reported, not
          adjudicated.
        </CqDisclaimer>
      </div>
    </div>
  );
}

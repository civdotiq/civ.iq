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
import type { LobbyFilingDetailData } from './types';

interface LobbyFilingDetailProps {
  data: LobbyFilingDetailData;
}

function formatCompactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n.toLocaleString()}`;
}

function formatExactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
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

function periodCovered(periodLabel: string, year: number): string {
  const lc = (periodLabel || '').toLowerCase();
  if (lc.includes('first')) return `Jan 1 – Mar 31, ${year}`;
  if (lc.includes('second') || lc.includes('mid')) return `Apr 1 – Jun 30, ${year}`;
  if (lc.includes('third')) return `Jul 1 – Sep 30, ${year}`;
  if (lc.includes('fourth') || lc.includes('year-end')) return `Oct 1 – Dec 31, ${year}`;
  return periodLabel || `${year}`;
}

function shortPeriod(periodLabel: string, year: number): string {
  const lc = (periodLabel || '').toLowerCase();
  if (lc.includes('first')) return `Q1 ${year}`;
  if (lc.includes('second') || lc.includes('mid')) return `Q2 ${year}`;
  if (lc.includes('third')) return `Q3 ${year}`;
  if (lc.includes('fourth') || lc.includes('year-end')) return `Q4 ${year}`;
  return `${year}`;
}

function buildPlainReading(data: LobbyFilingDetailData): string {
  const period = shortPeriod(data.filingPeriod, data.filingYear);
  const issueCount = data.issues.length;
  const lobbyistCount = data.lobbyists.length;
  const exGov = data.lobbyists.filter(l => l.coveredOfficialPosition).length;
  const amountStr = formatCompactDollars(data.amount);
  const verb = data.amountKind === 'expenses' ? 'reported' : 'reported gross income of';
  const exGovPart = exGov > 0 ? ` ${exGov} previously held a covered government position.` : '';
  return `${data.registrant.name} ${verb} ${amountStr} for ${data.client.name} during ${period}, covering ${issueCount} issue area${
    issueCount === 1 ? '' : 's'
  } across ${lobbyistCount} lobbyist${lobbyistCount === 1 ? '' : 's'}.${exGovPart} LDA filings disclose that contact occurred and the topic — not what was said.`;
}

function IssueCard({
  code,
  label,
  description,
}: {
  code: string;
  label: string;
  description: string;
}) {
  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--civiq-blue)',
            padding: '2px 6px',
            border: '1px solid var(--civiq-blue)',
            letterSpacing: '0.04em',
          }}
        >
          {code}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg2)', margin: 0, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

export function LobbyFilingDetail({ data }: LobbyFilingDetailProps) {
  const period = shortPeriod(data.filingPeriod, data.filingYear);
  const periodDates = periodCovered(data.filingPeriod, data.filingYear);
  const filedOn = formatDate(data.filingDate);
  const exGovCount = data.lobbyists.filter(l => l.coveredOfficialPosition).length;
  const amountLabel =
    data.amountKind === 'expenses'
      ? 'Expenses · in-house lobbying'
      : data.amountKind === 'income'
        ? 'Compensation · gross income'
        : 'Compensation · not reported';
  const amountValue = data.amount > 0 ? formatCompactDollars(data.amount) : '$0';
  const exactAmount = formatExactDollars(data.amount > 0 ? data.amount : 0);

  const sources = [
    { key: 'lda', source: 'Senate LDA', id: data.filingUuid },
    {
      key: 'reg',
      source: 'Registrant',
      id: data.registrant.id ? `#${data.registrant.id}` : data.registrant.name,
    },
  ];

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
          { name: 'Lobbying', url: 'https://civdotiq.org/lobby' },
          {
            name: `${data.registrant.name} — ${period}`,
            url: `https://civdotiq.org/lobby/filings/${data.filingUuid}`,
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
          href={data.registrant.id ? `/lobby/${data.registrant.id}` : '/lobby'}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← {data.registrant.id ? 'All registrant filings' : 'Lobbying filings'}
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
            Senate LDA · {data.filingTypeDisplay} · {period}
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
            {data.registrant.name}
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
            For client: <strong style={{ color: 'var(--fg1)' }}>{data.client.name}</strong>
            {data.clientCountry ? ` · ${data.clientCountry}` : ''} · Reporting period ·{' '}
            {periodDates}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              {data.filingTypeDisplay}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {data.lobbyists.length} lobbyist{data.lobbyists.length === 1 ? '' : 's'}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {data.issues.length} issue{data.issues.length === 1 ? '' : 's'}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {amountLabel.split('·')[0]?.trim()} · {amountValue}
            </CqChip>
            {data.termination && (
              <CqChip variant="warn" filled size="sm">
                Termination
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
              ['Form', data.filingType || data.filingTypeDisplay || 'LDA filing'],
              ['Filing UUID', data.filingUuid.slice(0, 8) + '…'],
              ['Period', period],
              ['Filed', filedOn],
              ['Registrant', data.registrant.id || '—'],
              ['Client', data.client.id || '—'],
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

      {/* Headline stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {[
          {
            key: 'amount',
            label: amountLabel.split('·')[0]?.trim() ?? 'Amount',
            value: amountValue,
            caption: `${period} · ${exactAmount}`,
            color: 'blue' as const,
          },
          {
            key: 'lobbyists',
            label: 'Lobbyists',
            value: data.lobbyists.length,
            caption: exGovCount > 0 ? `${exGovCount} ex-government` : 'No covered positions',
            color: 'ink' as const,
          },
          {
            key: 'issues',
            label: 'Issues covered',
            value: data.issues.length,
            caption:
              data.issues
                .slice(0, 3)
                .map(i => i.code)
                .join(' · ') || '—',
            color: 'ink' as const,
          },
          {
            key: 'bills',
            label: 'Bills referenced',
            value: data.bills.length,
            caption:
              data.bills.slice(0, 3).join(', ') ||
              (data.bills.length === 0 ? 'None matched in text' : '—'),
            color: 'ink' as const,
          },
          {
            key: 'contacts',
            label: 'Bodies contacted',
            value: data.contacts.length,
            caption:
              data.contacts.length > 0 ? 'Includes Congress + agencies' : 'No targets listed',
            color: 'ink' as const,
          },
        ].map((s, i) => (
          <div
            key={s.key}
            style={{
              padding: '20px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
            }}
          >
            <CqStat label={s.label} value={s.value} caption={s.caption} color={s.color} size={32} />
          </div>
        ))}
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
          {/* Lobbyists */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Registrants on this filing</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Lobbyists</div>
            </div>
            {data.lobbyists.length === 0 ? (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                }}
              >
                No lobbyists are listed on this filing. The registrant may have filed a placeholder
                report or terminated the engagement before any lobbying activity took place.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px minmax(0, 1fr) minmax(0, 220px)',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '2px solid var(--ink)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {['#', 'Name', 'Prior government role'].map(h => (
                    <CqLabel key={h}>{h}</CqLabel>
                  ))}
                </div>
                {data.lobbyists.map((l, i) => (
                  <div
                    key={`${l.name}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px minmax(0, 1fr) minmax(0, 220px)',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--line)',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--fg3)',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg2)' }}>
                      {l.coveredOfficialPosition ?? '—'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* Issues */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Issues covered · {data.issues.length}</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Subjects of contact</div>
            </div>
            {data.issues.length === 0 ? (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                }}
              >
                No issue codes are recorded on this filing. The registrant did not enumerate
                lobbying subjects for the period.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 0,
                  border: '2px solid var(--ink)',
                }}
              >
                {data.issues.map((iss, i) => (
                  <div
                    key={`${iss.code}-${i}`}
                    style={{
                      borderRight: i % 2 === 0 ? '1px solid var(--line)' : 0,
                      borderTop: i > 1 ? '1px solid var(--line)' : 0,
                    }}
                  >
                    <IssueCard code={iss.code} label={iss.label} description={iss.description} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Contacts */}
          <section>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Persons contacted · this period</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Government bodies + officials
              </div>
            </div>
            {data.contacts.length === 0 ? (
              <div
                style={{
                  border: '2px solid var(--ink)',
                  padding: '16px 18px',
                  background: 'var(--bg2)',
                  fontSize: 13,
                  color: 'var(--fg2)',
                }}
              >
                No government bodies are listed on this filing. The LDA report disclosed activity
                without specifying which chambers or agencies received contact.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 110px',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '2px solid var(--ink)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {['Body', 'Lobbyists assigned', 'Issue'].map(h => (
                    <CqLabel key={h}>{h}</CqLabel>
                  ))}
                </div>
                {data.contacts.map((c, i) => (
                  <div
                    key={`${c.body}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 110px',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--line)',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.body}</span>
                    <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{c.officials ?? '—'}</span>
                    {c.issueCode ? (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--civiq-blue)',
                          padding: '2px 6px',
                          border: '1px solid var(--civiq-blue)',
                          justifySelf: 'start',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {c.issueCode}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--fg3)' }}>—</span>
                    )}
                  </div>
                ))}
              </>
            )}
            <div style={{ marginTop: 16 }}>
              <CqPlainReading>{buildPlainReading(data)}</CqPlainReading>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside>
          <div style={{ border: '2px solid var(--ink)', padding: 18, marginBottom: 14 }}>
            <CqLabel>Client</CqLabel>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{data.client.name}</div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              {data.clientCountry ? `${data.clientCountry} · ` : ''}
              {data.client.id ? `Client #${data.client.id}` : 'No client ID'}
            </div>
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
              {[
                ['This filing', formatCompactDollars(data.amount)],
                ['Income', formatCompactDollars(data.income)],
                ['Expenses', formatCompactDollars(data.expenses)],
                ['Filing form', data.filingType || data.filingTypeDisplay || '—'],
                ['Period', period],
              ].map(([k, v]) => (
                <li
                  key={String(k)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '1px solid var(--line)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--fg3)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                </li>
              ))}
            </ul>
            {data.registrant.id && (
              <Link
                href={`/lobby/${data.registrant.id}`}
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  fontSize: 11,
                  color: 'var(--civiq-blue-active)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                All {data.registrant.name} filings →
              </Link>
            )}
          </div>

          <div
            style={{
              borderLeft: '6px solid var(--civiq-blue)',
              background: 'var(--bg2)',
              padding: '14px 16px',
            }}
          >
            <CqLabel>About LDA filings</CqLabel>
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--fg2)',
                lineHeight: 1.5,
              }}
            >
              Senate LDA filings are self-reported by the registrant. Compensation is gross income,
              not net. Contact disclosure shows the body lobbied — not what was discussed.
            </p>
          </div>

          {data.documentUrl && (
            <div style={{ marginTop: 14 }}>
              <a
                href={data.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  color: 'var(--civiq-blue-active)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Original filing PDF →
              </a>
            </div>
          )}
        </aside>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.97}
          asof={filedOn}
          method="Direct ingestion from Senate LDA API · self-reported by registrant"
        >
          {' '}
          Senate LDA filings are self-reported. Compensation is gross income, not net.
        </CqDisclaimer>
      </div>
    </div>
  );
}

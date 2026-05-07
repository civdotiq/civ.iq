/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqButton, CqChip, CqDisclaimer, CqLabel, CqSourceTag, CqStat } from '@/components/cq';
import { StateMark } from './StateMark';
import { SenatorsPanel } from './SenatorsPanel';
import { HousePanel } from './HousePanel';
import { StateLegislaturePanel } from './StateLegislaturePanel';
import { StateExecutivesPanel } from './StateExecutivesPanel';
import { Aside } from './Aside';
import {
  formatCompactCurrency,
  formatCurrencyDollars,
  formatDate,
  formatPopulation,
} from './helpers';
import type { StateOverviewData } from './types';

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'OpenStates', id: 'state legislature' },
  { name: 'Wikidata', id: 'state executives' },
  { name: 'Congress.gov', id: 'federal delegation' },
  { name: 'Census.gov', id: 'ACS 2021' },
  { name: 'USASpending.gov', id: 'FY rollup' },
];

interface StateOverviewProps {
  data: StateOverviewData;
}

export function StateOverview({ data }: StateOverviewProps) {
  const {
    stateCode,
    stateName,
    delegation,
    demographics,
    spending,
    legislature,
    executives,
    governorResult,
    fetchedAt,
  } = data;
  const senators = delegation?.senators ?? [];
  const houseMembers = delegation?.houseMembers ?? [];
  const totals = delegation?.totals ?? { d: 0, r: 0, i: 0 };
  const districtCount = houseMembers.length;
  const stateLegSeats = legislature?.totalCount ?? 0;
  const dataAsOf = formatDate(fetchedAt);

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
      {/* Sources rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <Link
          href="/states"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All states
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px minmax(0, 1fr) 240px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <StateMark abbr={stateCode} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              State
            </CqChip>
            {districtCount > 0 && (
              <CqChip variant="ink" filled={false} size="sm">
                {districtCount} House district{districtCount === 1 ? '' : 's'}
              </CqChip>
            )}
            {totals.d + totals.r + totals.i > 0 && (
              <CqChip variant="ink" filled={false} size="sm">
                {totals.d}D · {totals.r}R{totals.i > 0 ? ` · ${totals.i}I` : ''}
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 0.95,
              margin: '0 0 10px',
              textTransform: 'uppercase',
            }}
          >
            {stateName}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg2)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {demographics
              ? `${formatPopulation(demographics.population)} residents · ${formatCurrencyDollars(
                  demographics.medianHouseholdIncome
                )} median household · ACS ${demographics.surveyYear || 'est.'}`
              : 'Census ACS data unavailable'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <CqButton variant="secondary" size="sm">
              Find your reps →
            </CqButton>
          </Link>
          <Link href={`/delegation/${stateCode.toLowerCase()}`} style={{ textDecoration: 'none' }}>
            <CqButton variant="primary" size="sm">
              Delegation →
            </CqButton>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <StatCell index={0}>
          <CqStat
            label="House delegation"
            value={districtCount > 0 ? districtCount : '—'}
            caption={districtCount > 0 ? houseDelegationCaption(houseMembers) : 'Roster pending'}
            size={32}
          />
        </StatCell>
        <StatCell index={1}>
          <CqStat
            label="Senators"
            value={senators.length > 0 ? senators.length : '—'}
            caption={senators.length > 0 ? houseDelegationCaption(senators) : 'Roster pending'}
            size={32}
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="State legislators"
            value={stateLegSeats > 0 ? stateLegSeats : '—'}
            caption={
              legislature
                ? legislature.isUnicameral
                  ? 'Unicameral'
                  : 'Bicameral'
                : 'Data unavailable'
            }
            size={32}
          />
        </StatCell>
        <StatCell index={3}>
          <CqStat
            label="Federal spending"
            value={spending ? formatCompactCurrency(spending.aggregatedAmount) : '—'}
            caption={spending ? `USAspending · FY${spending.fiscalYear}` : 'Data unavailable'}
            color="blue"
            size={32}
          />
        </StatCell>
        <StatCell index={4}>
          <CqStat
            label="Per capita"
            value={spending && spending.perCapita ? formatCurrencyDollars(spending.perCapita) : '—'}
            caption={
              spending && spending.perCapita
                ? `USAspending · FY${spending.fiscalYear}`
                : 'Data unavailable'
            }
            size={32}
          />
        </StatCell>
      </div>

      {/* Secondary row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          borderBottom: '2px solid var(--ink)',
          background: 'var(--bg2)',
        }}
      >
        <KeyValueRow
          index={0}
          label="Population"
          value={demographics ? formatPopulation(demographics.population) : '—'}
        />
        <KeyValueRow
          index={1}
          label="Median household"
          value={demographics ? formatCurrencyDollars(demographics.medianHouseholdIncome) : '—'}
        />
        <KeyValueRow
          index={2}
          label="Median age"
          value={
            demographics && demographics.medianAge > 0 ? demographics.medianAge.toFixed(1) : '—'
          }
        />
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          marginTop: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <StateLegislaturePanel stateCode={stateCode} legislature={legislature} />
          <StateExecutivesPanel executives={executives} />
          <SenatorsPanel senators={senators} />
          <HousePanel houseMembers={houseMembers} stateCode={stateCode} />
        </div>
        <Aside stateCode={stateCode} spending={spending} governorResult={governorResult} />
      </div>

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={dataAsOf}
          method="Direct ingestion · OpenStates + Wikidata + Congress.gov + Census ACS + USAspending"
        />
      </div>
    </div>
  );
}

function StatCell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '20px 18px',
        borderLeft: index === 0 ? 0 : '1px solid var(--line)',
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function KeyValueRow({ index, label, value }: { index: number; label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 18px',
        borderLeft: index === 0 ? 0 : '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: value === '—' ? 'var(--fg4)' : 'var(--fg1)',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function houseDelegationCaption(members: { party: 'd' | 'r' | 'i' }[]): string {
  let d = 0;
  let r = 0;
  let i = 0;
  for (const m of members) {
    if (m.party === 'd') d += 1;
    else if (m.party === 'r') r += 1;
    else i += 1;
  }
  const parts = [`${d}D`, `${r}R`];
  if (i > 0) parts.push(`${i}I`);
  return parts.join(' · ');
}

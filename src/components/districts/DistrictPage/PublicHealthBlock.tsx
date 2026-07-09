/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Public health for the district — CDC PLACES. Leads with the population-
 * weighted DISTRICT estimate (aggregated from census-tract crude prevalence,
 * weighted by tract adult population), and keeps the county-level figures as a
 * source drill-down. Values are shares of adults; blue is used for data, never
 * red/green (reserved for party). Designed empty state on upstream failure.
 */

'use client';

import { CqLabel } from '@/components/cq';
import type { ServicesHealthProfile } from '@/types/district-enhancements';

type PublicHealth = NonNullable<ServicesHealthProfile['publicHealth']>;
type DistrictEstimate = NonNullable<PublicHealth['districtEstimate']>;

interface PublicHealthBlockProps {
  estimate: DistrictEstimate | null;
  countyMeasures: PublicHealth['measures'] | null;
  loading: boolean;
  failed?: boolean;
}

const SHORT_LABELS: Record<string, string> = {
  DIABETES: 'Diabetes',
  MHLTH: 'Mental distress',
  CHECKUP: 'Checkup',
  ACCESS2: 'Uninsured',
  OBESITY: 'Obesity',
  CSMOKING: 'Smoking',
};

const COLUMNS = 'minmax(0, 1fr) 84px 120px 76px';

export function PublicHealthBlock({
  estimate,
  countyMeasures,
  loading,
  failed,
}: PublicHealthBlockProps) {
  const hasEstimate = !!estimate && estimate.measures.some(m => m.value != null);

  return (
    <section>
      <CqLabel>Public health · CDC PLACES district estimate · share of adults</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 6 }}>
        Health of this district
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {loading
          ? 'Loading CDC PLACES…'
          : hasEstimate
            ? `Population-weighted from census tracts${
                estimate?.dataYear ? ` · ${estimate.dataYear}` : ''
              } · CDC PLACES`
            : 'CDC PLACES · census-tract model-based estimates'}
      </div>

      {loading ? (
        <SkeletonRows />
      ) : failed ? (
        <EmptyState message="Data unavailable — CDC PLACES did not load. The upstream feed is occasionally slow on cold start; refresh in a moment." />
      ) : !hasEstimate || !estimate ? (
        <EmptyState message="No district-level estimate met the coverage threshold for this district. CDC PLACES publishes county and tract figures, not congressional-district figures." />
      ) : (
        <>
          <EstimateTable estimate={estimate} />
          <p
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              lineHeight: 1.5,
              marginTop: 10,
            }}
          >
            Population-weighted mean of CDC PLACES census-tract crude prevalence, weighted by tract
            adult population. Confidence range (≈) is the population-weighted mean of tract limits,
            an approximation. Coverage is the share of district adult population represented.
          </p>
          {countyMeasures && countyMeasures.length > 0 && (
            <CountyDrilldown measures={countyMeasures} />
          )}
        </>
      )}
    </section>
  );
}

function EstimateTable({ estimate }: { estimate: DistrictEstimate }) {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['Measure', 'District', '≈ Range', 'Covered'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {estimate.measures.map(m => {
        const covered = Math.round(m.coverage.pctCovered * 100);
        return (
          <div
            key={m.measureId}
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'baseline',
              minHeight: 34,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: m.value != null ? 'var(--civiq-blue-active)' : 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}
            >
              {m.value != null ? `${m.value.toFixed(1)}%` : '—'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}
            >
              {m.value != null && m.lowCI != null && m.highCI != null
                ? `${m.lowCI.toFixed(1)}–${m.highCI.toFixed(1)}`
                : m.value == null
                  ? 'county only'
                  : '—'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
              }}
            >
              {covered}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CountyDrilldown({ measures }: { measures: PublicHealth['measures'] }) {
  const counties: Array<{ fips: string; name: string }> = [];
  for (const measure of measures) {
    for (const c of measure.counties) {
      if (!counties.some(x => x.fips === c.fips)) counties.push({ fips: c.fips, name: c.name });
    }
  }
  counties.sort((a, b) => a.name.localeCompare(b.name));
  if (counties.length === 0) return null;

  const cols = `minmax(0, 1fr) ${measures.map(() => '1fr').join(' ')}`;

  return (
    <details style={{ marginTop: 14 }}>
      <summary
        style={{
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--civiq-blue)',
        }}
      >
        County source data ({counties.length} {counties.length === 1 ? 'county' : 'counties'})
      </summary>
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <div style={{ minWidth: 460 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: cols,
              gap: 8,
              padding: '8px 0',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <CqLabel>County</CqLabel>
            {measures.map(m => (
              <CqLabel key={m.measureId}>{SHORT_LABELS[m.measureId] ?? m.measureId}</CqLabel>
            ))}
          </div>
          {counties.map(county => (
            <div
              key={county.fips}
              style={{
                display: 'grid',
                gridTemplateColumns: cols,
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 12 }}>{county.name}</span>
              {measures.map(m => {
                const entry = m.counties.find(c => c.fips === county.fips);
                return (
                  <span
                    key={m.measureId}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--fg2)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry != null ? `${entry.value.toFixed(1)}%` : '—'}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['Measure', 'District', '≈ Range', 'Covered'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid var(--line)',
            minHeight: 34,
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}

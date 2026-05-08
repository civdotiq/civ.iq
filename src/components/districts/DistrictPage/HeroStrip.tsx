/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Left-hand hero panel — numbers, label, headline. The MapPlaceholder
 * renders as a sibling on the right. DistrictPage composes them inside
 * a single 2-column container with a shared 2px outer border.
 */

'use client';

import { CqChip, CqLabel } from '@/components/cq';
import { districtDisplayLabel, formatCount, stateLongName } from './data';
import type { DistrictDetailsResponse } from './types';
import type { ParsedDistrictId } from './data';

interface HeroStripProps {
  parsed: ParsedDistrictId;
  details: DistrictDetailsResponse | null;
  loading: boolean;
}

export function HeroStrip({ parsed, details, loading }: HeroStripProps) {
  const label = districtDisplayLabel(parsed);
  const stateName = stateLongName(parsed.state);
  const districtName = details?.district.name;
  const counties = details?.district.geography.counties ?? [];
  const cities = details?.district.geography.majorCities ?? [];
  const repName = details?.district.representative.name;

  const stats: Array<{ k: string; v: string }> = details?.district.demographics
    ? [
        { k: 'Population', v: formatCount(details.district.demographics.population) },
        { k: 'Median age', v: details.district.demographics.medianAge.toFixed(1) },
        {
          k: 'Median HH income',
          v:
            details.district.demographics.medianIncome > 0
              ? `$${formatCount(details.district.demographics.medianIncome)}`
              : '—',
        },
        {
          k: 'College+ adults',
          v:
            details.district.demographics.bachelor_degree_percent > 0
              ? `${details.district.demographics.bachelor_degree_percent.toFixed(1)}%`
              : '—',
        },
        {
          k: 'Poverty rate',
          v:
            details.district.demographics.poverty_rate > 0
              ? `${details.district.demographics.poverty_rate.toFixed(1)}%`
              : '—',
        },
        { k: 'Counties', v: String(counties.length) },
      ]
    : Array.from({ length: 6 }).map((_, i) => ({
        k:
          [
            'Population',
            'Median age',
            'Median HH income',
            'College+ adults',
            'Poverty rate',
            'Counties',
          ][i] ?? '',
        v: '—',
      }));

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <CqChip variant="ink" size="sm">
          Federal · House
        </CqChip>
        <CqChip variant="info" filled={false} size="sm">
          119th Congress
        </CqChip>
        {parsed.isAtLarge && (
          <CqChip variant="info" filled={false} size="sm">
            At-large
          </CqChip>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {stateName} · {parsed.isAtLarge ? 'At-large' : `District ${parseInt(parsed.district, 10)}`}
      </div>
      <h1
        style={{
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          margin: '8px 0 4px',
          color: 'var(--civiq-blue)',
        }}
      >
        {label}
      </h1>
      <div
        style={{
          fontSize: 18,
          color: 'var(--fg2)',
          marginBottom: 16,
          fontWeight: 500,
          minHeight: 24,
        }}
      >
        {loading ? 'Loading district profile…' : (districtName ?? `${stateName} ${label}`)}
      </div>
      {cities.length > 0 && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.02em',
            marginBottom: 8,
          }}
        >
          {cities.slice(0, 4).join(' · ')}
          {cities.length > 4 ? ' · …' : ''}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          marginTop: 24,
        }}
      >
        {stats.map(s => (
          <div key={s.k}>
            <CqLabel>{s.k}</CqLabel>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {s.v}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          marginTop: 18,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {repName ? `Seated · ${repName}` : 'Source · Census ACS 5-year'}
      </div>
    </div>
  );
}

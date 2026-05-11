/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * EmbedDistrictCard — mast-less render chassis for
 * /embed/district/[districtId]?v=new. Receives the same `district` object
 * the legacy embed body resolves. Width-responsive via @container queries:
 *   ≤ 360 → 1-col stack
 *   ≥ 360 → 3-stat strip
 */

import { CqLabel, CqChip } from '@/components/cq';
import { EmbedFooter } from '../EmbedFooter';
import '../embed-print.css';

interface EmbedDistrictData {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
    imageUrl?: string;
  };
  demographics?: {
    population: number;
    medianIncome: number;
    medianAge: number;
  };
  geography: {
    counties: string[];
    majorCities: string[];
  };
}

interface EmbedDistrictCardProps {
  districtId: string;
  district: EmbedDistrictData;
}

function partyToken(party: string): 'd' | 'r' | 'i' {
  if (party === 'Democratic' || party === 'Democrat' || party === 'D') return 'd';
  if (party === 'Republican' || party === 'R') return 'r';
  return 'i';
}

function partyInitial(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return party.charAt(0).toUpperCase() || 'I';
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
}

function formatDollars(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

function StatCell({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div>
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.05,
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          marginTop: 3,
          color: 'var(--fg1)',
        }}
      >
        {value}
      </div>
      {caption && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

export function EmbedDistrictCard({ districtId, district }: EmbedDistrictCardProps) {
  const canonicalUrl = `https://civdotiq.org/districts/${districtId}`;
  const rep = district.representative;
  const stateCode = district.state.toUpperCase();
  const districtNum = district.number;

  return (
    <main className="civiq-embed-shell">
      <div className="civiq-embed-body">
        <div style={{ marginBottom: 14 }}>
          <CqLabel>District</CqLabel>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              marginTop: 3,
              marginBottom: 4,
              color: 'var(--fg1)',
            }}
          >
            {stateCode}-{districtNum}
          </h1>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {district.geography.majorCities[0] ?? district.name} · 119th Congr.
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            border: '1px solid var(--line)',
            background: 'var(--bg2)',
            marginBottom: 12,
          }}
        >
          <CqLabel>Current rep</CqLabel>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginTop: 4,
              lineHeight: 1.2,
              color: 'var(--fg1)',
            }}
          >
            {rep.name}
          </div>
          <div style={{ marginTop: 4 }}>
            <CqChip variant={partyToken(rep.party)} size="sm">
              {partyInitial(rep.party)} · {stateCode}-{districtNum}
            </CqChip>
          </div>
        </div>

        {district.demographics && district.demographics.population > 0 && (
          <div
            className="civiq-embed-grid-3"
            style={{
              padding: '10px 12px',
              border: '1px solid var(--line)',
            }}
          >
            <StatCell
              label="Pop."
              value={formatNumber(district.demographics.population)}
              caption="ACS 2023"
            />
            <StatCell
              label="Med. inc."
              value={formatDollars(district.demographics.medianIncome)}
              caption="ACS 2023"
            />
            <StatCell
              label="Med. age"
              value={district.demographics.medianAge.toFixed(0)}
              caption="years"
            />
          </div>
        )}

        {district.geography.majorCities.length > 1 && (
          <div
            className="civiq-embed-only-wide"
            style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Cities: {district.geography.majorCities.slice(0, 4).join(', ')}
            {district.geography.majorCities.length > 4 &&
              ` +${district.geography.majorCities.length - 4} more`}
          </div>
        )}
      </div>

      <EmbedFooter
        canonicalUrl={canonicalUrl}
        timestamp={new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      />
    </main>
  );
}

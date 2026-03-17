/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * CiviqDistrictCard — Compact district intelligence card for embedding.
 *
 * Displays district alignment, peer comparison, and top sector.
 * Follows Aicher/Ulm design system.
 */

import { displaySector } from '@/lib/mesh/sector-display';

interface CiviqDistrictCardProps {
  districtId: string;
  districtLabel: string;
  repAlignment?: number | null;
  peerAvg?: number | null;
  topSector?: string | null;
  dataAsOf: string;
}

export default function CiviqDistrictCard({
  districtId,
  districtLabel,
  repAlignment,
  peerAvg,
  topSector,
  dataAsOf,
}: CiviqDistrictCardProps) {
  return (
    <div
      style={{
        border: '2px solid #1a1a1a',
        padding: '16px',
        maxWidth: '360px',
        fontFamily: "'Braun Linear', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
        {districtId} &middot; {districtLabel}
      </div>

      <Row label="Rep Match" value={formatPct(repAlignment)} bar={repAlignment} />
      <Row label="Similar Districts Avg" value={formatPct(peerAvg)} />
      <Row label="Top Industry" value={topSector ? displaySector(topSector) : 'N/A'} />

      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '2px solid #e5e5e5',
          fontSize: '11px',
          color: '#999',
        }}
      >
        Data:{' '}
        <a
          href="https://civ.iq"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4', textDecoration: 'none' }}
        >
          CIV.IQ
        </a>{' '}
        &middot; {formatDate(dataAsOf)}
      </div>
    </div>
  );
}

function Row({ label, value, bar }: { label: string; value: string; bar?: number | null }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        borderBottom: '2px solid #e5e5e5',
      }}
    >
      <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {value}
        {bar != null && <BarFill value={bar} />}
      </span>
    </div>
  );
}

function BarFill({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const color = pct >= 70 ? '#0a9338' : pct >= 40 ? '#d4a03e' : '#e11d07';
  return (
    <span style={{ width: '80px', height: '8px', background: '#e5e5e5', display: 'inline-block' }}>
      <span style={{ width: `${pct}%`, height: '100%', background: color, display: 'block' }} />
    </span>
  );
}

function formatPct(value?: number | null): string {
  if (value == null) return 'N/A';
  return `${Math.round(value * 100)}%`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

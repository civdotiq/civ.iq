/**
 * Embeddable Widget: District Representatives
 * Server component - fetches data at render time via existing service layer.
 *
 * PR 22 gate: `?v=new` swaps the legacy body for EmbedRepsCard while sharing
 * the same resolved `reps` array.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { EmbedRepsCard } from '@/components/embed/EmbedRepsCard';

interface PageProps {
  params: Promise<{ districtId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { districtId } = await params;
  return {
    title: `Representatives - ${districtId.toUpperCase()}`,
  };
}

function partyColor(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return '#0a9338';
  if (party === 'Republican') return '#e11d07';
  return '#6b7280';
}

export default async function EmbedRepsPage({ params, searchParams }: PageProps) {
  const { districtId } = await params;
  const { v } = await searchParams;

  // Parse district ID (e.g., "MI-12", "CA-04")
  const parts = districtId.toUpperCase().split('-');
  const stateCode = parts[0] || '';
  const districtNum = parts[1] || '';

  const representatives = await getAllEnhancedRepresentatives();

  // Find House rep for this district
  const houseReps = representatives.filter(rep => {
    if (rep.chamber !== 'House' || rep.state !== stateCode) return false;
    const repDist = rep.district?.replace(/^0+/, '') || '0';
    const targetDist = districtNum.replace(/^0+/, '') || '0';
    return (
      repDist === targetDist ||
      (targetDist === '0' && (rep.district === 'At Large' || rep.district === '01'))
    );
  });

  // Find senators for this state
  const senators = representatives.filter(
    rep => rep.chamber === 'Senate' && rep.state === stateCode
  );

  const allReps = [...senators, ...houseReps];

  if (allReps.length === 0) {
    return (
      <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          No representatives found for {districtId.toUpperCase()}.
        </p>
      </div>
    );
  }

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <EmbedRepsCard districtId={districtId} reps={allReps} />;
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif', maxWidth: '100%' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#6b7280',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          {stateCode}-{districtNum} Representatives
        </span>
        <a
          href={`https://civdotiq.org/districts/${districtId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4', textDecoration: 'none', fontSize: '10px' }}
        >
          CIV.IQ
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {allReps.map(rep => (
          <a
            key={rep.bioguideId}
            href={`https://civdotiq.org/representative/${rep.bioguideId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '2px solid #e5e7eb',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {rep.imageUrl && (
              <img
                src={rep.imageUrl}
                alt={`${rep.name} photo`}
                width={48}
                height={48}
                style={{ width: '48px', height: '48px', objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{rep.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                <span style={{ color: partyColor(rep.party), fontWeight: 500 }}>{rep.party}</span>
                {' · '}
                {rep.chamber === 'Senate' ? 'U.S. Senator' : `U.S. Representative`}
              </div>
              {rep.currentTerm?.phone && (
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {rep.currentTerm.phone}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '10px',
          color: '#9ca3af',
          textAlign: 'right',
        }}
      >
        Data from Congress.gov via{' '}
        <a
          href="https://civdotiq.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3ea2d4', textDecoration: 'none' }}
        >
          CIV.IQ
        </a>
      </div>
    </div>
  );
}

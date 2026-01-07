/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Image Generation for Congressional Districts
 *
 * Generates dynamic Open Graph images for district sharing.
 * Following Ulm School / Rams design principles.
 *
 * @example /api/og/district/CA-12
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface DistrictData {
  districtId: string;
  state: string;
  stateCode: string;
  district: string | number;
  representative?: {
    name: string;
    party: string;
    bioguideId: string;
  };
  population?: number;
  landArea?: number;
  medianIncome?: number;
}

async function fetchDistrictData(districtId: string): Promise<DistrictData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';

  try {
    const response = await fetch(`${baseUrl}/api/districts/${districtId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function formatNumber(num?: number): string {
  if (!num) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString();
}

function formatCurrency(num?: number): string {
  if (!num) return '—';
  return `$${formatNumber(num)}`;
}

function getPartyColor(party?: string): string {
  if (!party) return '#666666';
  const p = party.toLowerCase();
  if (p.includes('democrat')) return '#3ea2d4';
  if (p.includes('republican')) return '#e11d07';
  return '#0a9338';
}

// CIV.IQ Geometric Logo Component
function CiviqLogo({ size = 48 }: { size?: number }) {
  const circleSize = size;
  const barWidth = circleSize * 0.5;
  const barHeight = circleSize * 1.2;
  const dotSize = circleSize * 0.2;
  const dotSpacing = size * 0.15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          backgroundColor: '#e11d07',
        }}
      />
      <div
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          backgroundColor: '#0a9338',
        }}
      />
      <div style={{ display: 'flex', gap: `${dotSpacing}px`, marginTop: '4px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              borderRadius: '50%',
              backgroundColor: '#3ea2d4',
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface RouteParams {
  params: Promise<{ districtId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { districtId } = await params;
  const district = await fetchDistrictData(districtId);

  if (!district) {
    return new Response('District not found', { status: 404 });
  }

  const partyColor = getPartyColor(district.representative?.party);
  const districtLabel =
    district.district === 'AL' || district.district === 0
      ? 'At-Large'
      : `District ${district.district}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                letterSpacing: '0.1em',
                color: '#666666',
                marginBottom: '8px',
              }}
            >
              CONGRESSIONAL DISTRICT
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: '#000000',
              }}
            >
              {district.stateCode}-{district.district}
            </div>
            <div style={{ fontSize: 24, color: '#666666', marginTop: '8px' }}>
              {district.state} {districtLabel}
            </div>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
          >
            <CiviqLogo size={56} />
            <div style={{ fontSize: 12, color: '#666666', marginTop: '4px' }}>
              Real Government Data
            </div>
          </div>
        </div>

        {/* Representative */}
        {district.representative && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '24px',
              backgroundColor: '#f5f5f5',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '80px',
                backgroundColor: partyColor,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>
                REPRESENTATIVE
              </div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#000000', marginTop: '4px' }}>
                {district.representative.name}
              </div>
              <div style={{ fontSize: 18, color: '#666666', marginTop: '4px' }}>
                {district.representative.party}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '64px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000' }}>
              {formatNumber(district.population)}
            </div>
            <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>POPULATION</div>
          </div>
          {district.medianIncome && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000' }}>
                {formatCurrency(district.medianIncome)}
              </div>
              <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>
                MEDIAN INCOME
              </div>
            </div>
          )}
          {district.landArea && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000' }}>
                {formatNumber(district.landArea)}
              </div>
              <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>SQ MILES</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: '24px',
            borderTop: '2px solid #e0e0e0',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#3ea2d4' }}>civdotiq.org</div>
          <div style={{ fontSize: 14, color: '#666666' }}>Find your representative at CIV.IQ</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

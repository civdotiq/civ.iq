/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Image Generation for Committees
 *
 * Generates dynamic Open Graph images for committee sharing.
 * Following Ulm School / Rams design principles.
 *
 * @example /api/og/committee/HSAG
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface CommitteeData {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type?: string;
  jurisdiction?: string;
  chair?: {
    name: string;
    party: string;
    state: string;
  };
  rankingMember?: {
    name: string;
    party: string;
    state: string;
  };
  subcommittees?: Array<{ name: string }>;
  memberCount?: number;
}

async function fetchCommitteeData(committeeId: string): Promise<CommitteeData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';

  try {
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function getChamberColor(chamber: string): string {
  switch (chamber) {
    case 'House':
      return '#3ea2d4';
    case 'Senate':
      return '#e11d07';
    case 'Joint':
      return '#0a9338';
    default:
      return '#666666';
  }
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
  params: Promise<{ committeeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { committeeId } = await params;
  const committee = await fetchCommitteeData(committeeId);

  if (!committee) {
    return new Response('Committee not found', { status: 404 });
  }

  const chamberColor = getChamberColor(committee.chamber);
  const subcommitteeCount = committee.subcommittees?.length ?? 0;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                padding: '8px 20px',
                backgroundColor: chamberColor,
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 'bold',
                letterSpacing: '0.1em',
              }}
            >
              {committee.chamber.toUpperCase()}
            </div>
            {committee.type && (
              <div style={{ fontSize: 16, color: '#666666', letterSpacing: '0.05em' }}>
                {committee.type} Committee
              </div>
            )}
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

        {/* Committee Name */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 'bold',
            color: '#000000',
            lineHeight: 1.2,
            marginBottom: '32px',
          }}
        >
          {committee.name}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '48px', marginBottom: '32px' }}>
          {committee.memberCount && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000' }}>
                {committee.memberCount}
              </div>
              <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>MEMBERS</div>
            </div>
          )}
          {subcommitteeCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000' }}>
                {subcommitteeCount}
              </div>
              <div style={{ fontSize: 14, color: '#666666', letterSpacing: '0.1em' }}>
                SUBCOMMITTEES
              </div>
            </div>
          )}
        </div>

        {/* Leadership */}
        <div style={{ display: 'flex', gap: '32px', flex: 1 }}>
          {committee.chair && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                border: '2px solid #000000',
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: '#666666',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                }}
              >
                CHAIR
              </div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#000000' }}>
                {committee.chair.name}
              </div>
              <div style={{ fontSize: 16, color: '#666666', marginTop: '4px' }}>
                ({committee.chair.party?.[0] || 'I'}-{committee.chair.state})
              </div>
            </div>
          )}
          {committee.rankingMember && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                border: '2px solid #e0e0e0',
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: '#666666',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                }}
              >
                RANKING MEMBER
              </div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#000000' }}>
                {committee.rankingMember.name}
              </div>
              <div style={{ fontSize: 16, color: '#666666', marginTop: '4px' }}>
                ({committee.rankingMember.party?.[0] || 'I'}-{committee.rankingMember.state})
              </div>
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
          <div style={{ fontSize: 14, color: '#666666' }}>Congressional Committees at CIV.IQ</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

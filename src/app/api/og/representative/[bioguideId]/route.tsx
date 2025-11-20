/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Image Generation for Representative Profiles
 *
 * Generates dynamic Open Graph images for social media sharing.
 * Following Ulm School / Rams design principles.
 *
 * Card types:
 * - finance: Campaign finance data
 * - alignment: Party voting record
 * - impact: Legislative productivity
 * - overview: General stats (default)
 *
 * Usage:
 * /api/og/representative/K000367?type=finance
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface RepresentativeData {
  representative: {
    name: string;
    party: string;
    state: string;
    chamber: 'House' | 'Senate';
    district?: string;
  };
  stats: {
    finance?: {
      totalRaised?: number;
      individualPercent?: number;
      pacPercent?: number;
      topIndustry?: { name: string; amount: number };
    };
    alignment?: {
      partyAlignment?: number;
      bipartisanVotes?: number;
      trend?: 'increasing' | 'decreasing' | 'stable';
    };
    bills?: {
      sponsored?: number;
      enacted?: number;
    };
    committees?: {
      count?: number;
    };
  };
}

// Fetch representative and stats data
async function fetchRepresentativeData(bioguideId: string): Promise<RepresentativeData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';

  try {
    // Fetch representative profile
    const repResponse = await fetch(`${baseUrl}/api/representative/${bioguideId}/simple`);

    if (!repResponse.ok) {
      return null;
    }

    const repData = await repResponse.json();
    // Extract member data from nested response
    const memberData = repData.member || repData;

    // Map to our expected structure
    const representative = {
      name: `${memberData.firstName} ${memberData.lastName}`,
      party: memberData.partyHistory?.[0]?.partyName || 'Independent',
      state: memberData.state || memberData.terms?.[memberData.terms.length - 1]?.stateName || '',
      chamber: memberData.terms?.[memberData.terms.length - 1]?.chamber || 'House',
      district: memberData.terms?.[memberData.terms.length - 1]?.district,
    };

    // Fetch batch stats
    const statsResponse = await fetch(
      `${baseUrl}/api/representative/${bioguideId}/batch?summary=true`
    );

    let stats = {};
    if (statsResponse.ok) {
      stats = await statsResponse.json();
    }

    return { representative, stats };
  } catch {
    return null;
  }
}

// Format currency for display
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
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
      {/* Red circle */}
      <div
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          backgroundColor: '#e11d07',
        }}
      />
      {/* Green bar */}
      <div
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          backgroundColor: '#0a9338',
        }}
      />
      {/* Blue dots */}
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

// Finance Card Design
function FinanceCard({ representative, stats }: RepresentativeData) {
  const totalRaised = stats.finance?.totalRaised || 0;
  const individualPercent = stats.finance?.individualPercent || 0;
  const pacPercent = stats.finance?.pacPercent || 0;
  const topIndustry = stats.finance?.topIndustry || null;

  return (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            CAMPAIGN FINANCE
          </div>
          <div style={{ fontSize: 24, color: '#666666', display: 'flex' }}>
            <span>
              {representative.chamber === 'Senate' ? 'Sen.' : 'Rep.'} {representative.name} (
              {representative.party?.[0] || 'I'}-{representative.state})
            </span>
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
        >
          <CiviqLogo size={64} />
          <div style={{ fontSize: 12, color: '#666666', marginTop: '4px' }}>
            Real Government Data
          </div>
        </div>
      </div>

      {/* Hero Stat */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px 0' }}
      >
        <div style={{ fontSize: 96, fontWeight: 'bold', color: '#000000' }}>
          {totalRaised > 0 ? formatCurrency(totalRaised) : '—'}
        </div>
        <div style={{ fontSize: 20, color: '#666666', marginTop: '8px', letterSpacing: '0.1em' }}>
          TOTAL RAISED
        </div>
      </div>

      {/* Funding Sources */}
      {(individualPercent > 0 || pacPercent > 0) && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}
        >
          {/* Individual bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '140px', fontSize: 16, color: '#666666' }}>Individual</div>
            <div
              style={{
                width: `${individualPercent * 4}px`,
                height: '32px',
                backgroundColor: '#3ea2d4',
                border: '2px solid #000000',
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{individualPercent.toFixed(0)}%</div>
          </div>
          {/* PAC bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '140px', fontSize: 16, color: '#666666' }}>PAC</div>
            <div
              style={{
                width: `${pacPercent * 4}px`,
                height: '32px',
                backgroundColor: '#cccccc',
                border: '2px solid #000000',
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{pacPercent.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Top Industry */}
      {topIndustry && (
        <div style={{ fontSize: 16, color: '#666666', marginTop: '16px' }}>
          Top Industry:{' '}
          <span style={{ fontWeight: 'bold', color: '#000000' }}>
            {topIndustry.name} ({formatCurrency(topIndustry.amount)})
          </span>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 'auto',
          paddingTop: '32px',
          borderTop: '2px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: 14, color: '#666666' }}>civdotiq.org</div>
        <div style={{ fontSize: 12, color: '#999999' }}>Transparency through data</div>
      </div>
    </div>
  );
}

// Alignment Card Design
function AlignmentCard({ representative, stats }: RepresentativeData) {
  const partyAlignment = stats.alignment?.partyAlignment || 0;
  const bipartisanVotes = stats.alignment?.bipartisanVotes || 0;
  const trend = stats.alignment?.trend || 'stable';

  const trendSymbol = trend === 'increasing' ? '↑' : trend === 'decreasing' ? '↓' : '→';

  return (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            PARTY VOTING RECORD
          </div>
          <div style={{ fontSize: 24, color: '#666666', display: 'flex' }}>
            <span>
              {representative.chamber === 'Senate' ? 'Sen.' : 'Rep.'} {representative.name} (
              {representative.party?.[0] || 'I'}-{representative.state})
            </span>
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
        >
          <CiviqLogo size={64} />
          <div style={{ fontSize: 12, color: '#666666', marginTop: '4px' }}>
            Real Government Data
          </div>
        </div>
      </div>

      {/* Hero Stat */}
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px 0' }}
      >
        <div style={{ fontSize: 96, fontWeight: 'bold', color: '#000000', display: 'flex' }}>
          <span>{partyAlignment.toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: 20, color: '#666666', marginTop: '8px', letterSpacing: '0.1em' }}>
          PARTY ALIGNMENT
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, color: '#666666' }}>Bipartisan votes</div>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>{bipartisanVotes}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, color: '#666666' }}>Trend</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', display: 'flex', gap: '8px' }}>
            <span>{trendSymbol}</span>
            <span>{trend}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 'auto',
          paddingTop: '32px',
          borderTop: '2px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: 14, color: '#666666' }}>civdotiq.org</div>
        <div style={{ fontSize: 12, color: '#999999' }}>Transparency through data</div>
      </div>
    </div>
  );
}

// Impact Card Design
function ImpactCard({ representative, stats }: RepresentativeData) {
  const billsSponsored = stats.bills?.sponsored || 0;
  const billsEnacted = stats.bills?.enacted || 0;
  const committees = stats.committees?.count || 0;

  return (
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              marginBottom: '8px',
            }}
          >
            LEGISLATIVE IMPACT
          </div>
          <div style={{ fontSize: 24, color: '#666666', display: 'flex' }}>
            <span>
              {representative.chamber === 'Senate' ? 'Sen.' : 'Rep.'} {representative.name} (
              {representative.party?.[0] || 'I'}-{representative.state})
            </span>
          </div>
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}
        >
          <CiviqLogo size={64} />
          <div style={{ fontSize: 12, color: '#666666', marginTop: '4px' }}>
            Real Government Data
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'flex', gap: '48px', marginTop: '40px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#000000' }}>{billsSponsored}</div>
          <div style={{ fontSize: 16, color: '#666666', marginTop: '8px', letterSpacing: '0.1em' }}>
            BILLS SPONSORED
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#0a9338' }}>{billsEnacted}</div>
          <div style={{ fontSize: 16, color: '#666666', marginTop: '8px', letterSpacing: '0.1em' }}>
            ENACTED
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#3ea2d4' }}>{committees}</div>
          <div style={{ fontSize: 16, color: '#666666', marginTop: '8px', letterSpacing: '0.1em' }}>
            COMMITTEES
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 'auto',
          paddingTop: '32px',
          borderTop: '2px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: 14, color: '#666666' }}>civdotiq.org</div>
        <div style={{ fontSize: 12, color: '#999999' }}>119th Congress</div>
      </div>
    </div>
  );
}

// Overview Card (Default)
function OverviewCard({ representative, stats }: RepresentativeData) {
  return (
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
      {/* Header with Logo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '48px',
        }}
      >
        <CiviqLogo size={80} />
        <div style={{ fontSize: 12, color: '#666666' }}>Real Government Data</div>
      </div>

      {/* Representative Name */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '48px' }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#000000', marginBottom: '8px' }}>
          {representative.name}
        </div>
        <div style={{ fontSize: 24, color: '#666666', display: 'flex' }}>
          <span>
            U.S. {representative.chamber === 'Senate' ? 'Senator' : 'Representative'},{' '}
            {representative.state}
            {representative.district ? `-${representative.district}` : ''}
          </span>
        </div>
        <div style={{ fontSize: 20, color: '#999999', marginTop: '8px' }}>
          {representative.party}
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
        {(stats.bills?.sponsored || 0) > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', color: '#3ea2d4' }}>
              {stats.bills?.sponsored}
            </div>
            <div style={{ fontSize: 14, color: '#666666', marginTop: '4px' }}>Bills Sponsored</div>
          </div>
        )}
        {(stats.finance?.totalRaised || 0) > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', color: '#e11d07' }}>
              {formatCurrency(stats.finance?.totalRaised || 0)}
            </div>
            <div style={{ fontSize: 14, color: '#666666', marginTop: '4px' }}>Total Raised</div>
          </div>
        )}
        {(stats.committees?.count || 0) > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 'bold', color: '#0a9338' }}>
              {stats.committees?.count}
            </div>
            <div style={{ fontSize: 14, color: '#666666', marginTop: '4px' }}>Committees</div>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 'auto',
          paddingTop: '32px',
          borderTop: '2px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: 18, color: '#000000', fontWeight: 'bold', marginBottom: '8px' }}>
          Campaign Finance • Voting Records • Legislation
        </div>
        <div style={{ fontSize: 14, color: '#666666' }}>civdotiq.org</div>
      </div>
    </div>
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  try {
    const { bioguideId } = await params;
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || 'overview';

    // Fetch data
    const data = await fetchRepresentativeData(bioguideId);

    if (!data) {
      return new Response('Representative not found', { status: 404 });
    }

    const { representative, stats } = data;

    // Select card type
    let CardComponent;
    switch (type) {
      case 'finance':
        CardComponent = FinanceCard;
        break;
      case 'alignment':
        CardComponent = AlignmentCard;
        break;
      case 'impact':
        CardComponent = ImpactCard;
        break;
      default:
        CardComponent = OverviewCard;
    }

    return new ImageResponse(<CardComponent representative={representative} stats={stats} />, {
      width: 1200,
      height: 630,
    });
  } catch {
    // Error generating OG image
    return new Response('Error generating image', { status: 500 });
  }
}

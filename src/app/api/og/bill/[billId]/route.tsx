/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OG Image Generation for Bills
 *
 * Generates dynamic Open Graph images for legislation sharing.
 * Following Ulm School / Rams design principles.
 *
 * @example /api/og/bill/hr1234-119
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface BillData {
  number: string;
  title: string;
  type: string;
  congress: number;
  status?: string;
  sponsor?: {
    name: string;
    party: string;
    state: string;
  };
  introducedDate?: string;
  latestAction?: {
    text: string;
    actionDate: string;
  };
}

async function fetchBillData(billId: string): Promise<BillData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';

  try {
    const response = await fetch(`${baseUrl}/api/bill/${billId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function getStatusColor(status?: string): string {
  if (!status) return '#666666';
  const s = status.toLowerCase();
  if (s.includes('enacted') || s.includes('passed') || s.includes('became law')) return '#0a9338';
  if (s.includes('failed') || s.includes('vetoed')) return '#e11d07';
  return '#3ea2d4';
}

function getStatusLabel(status?: string): string {
  if (!status) return 'INTRODUCED';
  const s = status.toLowerCase();
  if (s.includes('enacted') || s.includes('became law')) return 'ENACTED';
  if (s.includes('passed')) return 'PASSED';
  if (s.includes('failed')) return 'FAILED';
  if (s.includes('vetoed')) return 'VETOED';
  if (s.includes('committee')) return 'IN COMMITTEE';
  return 'ACTIVE';
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
  params: Promise<{ billId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { billId } = await params;
  const bill = await fetchBillData(billId);

  if (!bill) {
    return new Response('Bill not found', { status: 404 });
  }

  const statusColor = getStatusColor(bill.status);
  const statusLabel = getStatusLabel(bill.status);
  const truncatedTitle =
    bill.title.length > 120 ? bill.title.substring(0, 117) + '...' : bill.title;

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
              {bill.congress}TH CONGRESS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 'bold',
                  color: '#000000',
                  fontFamily: 'monospace',
                }}
              >
                {bill.number}
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: statusColor,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  letterSpacing: '0.1em',
                }}
              >
                {statusLabel}
              </div>
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

        {/* Title */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 'normal',
            color: '#000000',
            lineHeight: 1.3,
            marginBottom: '40px',
            flex: 1,
          }}
        >
          {truncatedTitle}
        </div>

        {/* Sponsor */}
        {bill.sponsor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ fontSize: 16, color: '#666666' }}>Sponsored by</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#000000' }}>
              {bill.sponsor.name}
            </div>
            <div
              style={{
                padding: '4px 12px',
                border: '2px solid #000000',
                fontSize: 14,
                fontWeight: 'bold',
              }}
            >
              {bill.sponsor.party?.[0] || 'I'}-{bill.sponsor.state}
            </div>
          </div>
        )}

        {/* Latest Action */}
        {bill.latestAction && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f5f5f5',
              border: '2px solid #e0e0e0',
              fontSize: 16,
              color: '#333333',
            }}
          >
            <span style={{ fontWeight: 'bold' }}>Latest: </span>
            {bill.latestAction.text.length > 100
              ? bill.latestAction.text.substring(0, 97) + '...'
              : bill.latestAction.text}
          </div>
        )}

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
          <div style={{ fontSize: 14, color: '#666666' }}>Track legislation at CIV.IQ</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

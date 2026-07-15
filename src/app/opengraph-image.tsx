/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Site-Wide Default OG Image ("Link Preview Card")
 *
 * Next.js convention file — the 1200x630 card shown when civdotiq.org is
 * pasted in chat or social. Ported from the CIV.IQ Design System template
 * templates/link-preview/LinkPreview.dc.html (Aicher/Ulm design system).
 *
 * Rendered via Satori/ImageResponse, which can't load woff2 — so we use
 * system-ui rather than Braun Linear, matching the trading-card system.
 *
 * The "Bills this Congress" ticker is fetched live from Congress.gov (same
 * source as the homepage hero) so the card never ships a fabricated number;
 * it falls back to an honest floor when the API is unreachable.
 */

import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BILLS_FALLBACK = '8,000+';

/** Live count of bills introduced this Congress (real data or honest floor). */
async function fetchBillCount(): Promise<string> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return BILLS_FALLBACK;

  const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
  try {
    const res = await fetch(`https://api.congress.gov/v3/bill/${congress}?limit=1&format=json`, {
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return BILLS_FALLBACK;
    const raw = await res.json();
    const n = raw?.pagination?.count;
    return typeof n === 'number' ? n.toLocaleString('en-US') : BILLS_FALLBACK;
  } catch {
    return BILLS_FALLBACK;
  }
}

export default async function OgImage() {
  try {
    let logoSrc = '';
    try {
      const logoPath = join(process.cwd(), 'public/images/civiq-logo.png');
      logoSrc = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
    } catch {
      // Skip logo if unavailable during prerender
    }

    const billCount = await fetchBillCount();

    // Ticker stats. Members (535) and update cadence (Daily) are standing true
    // claims used site-wide; the bill count is live. Set STAT_TICKER = false or
    // swap the footer bar to the black variant per the design's barStyle prop.
    const ticker = [
      { value: '535', label: 'Members tracked' },
      { value: billCount, label: 'Bills this Congress' },
      { value: 'Daily', label: 'Data updates' },
    ];

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            border: '3px solid #000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#111827',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '36px 64px 0',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Nonpartisan · Free · No account needed
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              civdotiq.org
            </span>
          </div>

          {/* Main row: logo + copy */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 52,
              padding: '0 64px',
            }}
          >
            {logoSrc && (
              <img
                src={logoSrc}
                width={246}
                height={269}
                alt="CIV.IQ logo"
                style={{ objectFit: 'contain' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div
                style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}
              >
                CIV.IQ
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  marginTop: 20,
                }}
              >
                Know what your representatives actually do
              </div>
              <div
                style={{
                  fontSize: 20,
                  lineHeight: 1.5,
                  letterSpacing: '0.025em',
                  color: '#4b5563',
                  marginTop: 16,
                  maxWidth: 760,
                }}
              >
                Every member of Congress, one plain record: bills passed, votes cast, campaign money
                raised, and federal dollars brought home — straight from official sources.
              </div>
            </div>
          </div>

          {/* Stat ticker */}
          <div style={{ display: 'flex', gap: 44, padding: '0 64px 32px' }}>
            {ticker.map(stat => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  flex: 1,
                  borderTop: '2px solid #000000',
                  paddingTop: 10,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#4b5563',
                    marginLeft: 10,
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Tricolor accent bar (design default; swap to a single #000000 bar
              for the "black" barStyle variant) */}
          <div style={{ display: 'flex', height: 8 }}>
            <div style={{ flex: 1, backgroundColor: '#e11d07' }} />
            <div style={{ flex: 1, backgroundColor: '#0a9338' }} />
            <div style={{ flex: 1, backgroundColor: '#3ea2d4' }} />
          </div>

          {/* Footer: sources + CTA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 24,
              padding: '16px 64px 22px',
              fontSize: 14,
              letterSpacing: '0.025em',
              color: '#4b5563',
            }}
          >
            <span>Sources: Congress.gov · FEC · USASpending · House Clerk</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>Look up your representative →</span>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch {
    // Fallback: minimal valid response if ImageResponse fails during prerender
    return new Response('CIV.IQ', { headers: { 'Content-Type': 'text/plain' } });
  }
}

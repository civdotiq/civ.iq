/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Site-Wide Default OG Image
 *
 * Next.js convention file — generates the fallback OpenGraph image
 * for all pages that don't provide their own.
 * 1200x630 PNG via Satori/ImageResponse. Aicher/Ulm design system.
 * Uses system-ui font (same as trading card system — Satori doesn't support woff2).
 */

import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  // Load logo as base64
  let logoSrc = '';
  try {
    const logoPath = join(process.cwd(), 'public/images/civiq-logo.png');
    const logoBuffer = readFileSync(logoPath);
    logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    // Skip logo if unavailable
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          border: '2px solid #000000',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Red accent bar */}
        <div style={{ width: '100%', height: 8, backgroundColor: '#e11d07', display: 'flex' }} />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 80px',
          }}
        >
          {/* Logo */}
          {logoSrc && <img src={logoSrc} width={96} height={96} style={{ marginBottom: 32 }} />}

          {/* Title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#000000',
              letterSpacing: '-1px',
              display: 'flex',
            }}
          >
            CIV.IQ
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#333333',
              marginTop: 16,
              display: 'flex',
            }}
          >
            Who Represents You?
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 22,
              color: '#666666',
              marginTop: 24,
              textAlign: 'center',
              display: 'flex',
            }}
          >
            Real government data. 535 Members of Congress. 50 State Legislatures.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 0',
            borderTop: '2px solid #000000',
          }}
        >
          <div style={{ fontSize: 20, color: '#999999', display: 'flex' }}>civdotiq.org</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

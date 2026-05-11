/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Ward-map placeholder — static SVG only. Real Mapbox/MapLibre wiring
 * is a follow-up PR (chat10 decision #8). Mirrors the DistrictPage
 * MapPlaceholder treatment: diagonal-stripe ground + "Schematic ·
 * placeholder" tag. Generic (not city-specific) — most of our covered
 * cities use ward systems, not the 5-borough NYC schematic the
 * reference draws.
 */

'use client';

import { CqLabel } from '@/components/cq';

interface WardMapPlaceholderProps {
  cityName: string;
}

export function WardMapPlaceholder({ cityName }: WardMapPlaceholderProps) {
  return (
    <div style={{ border: '2px solid var(--ink)' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
        <CqLabel>{cityName} · ward map</CqLabel>
      </div>
      <div
        style={{
          position: 'relative',
          background: 'var(--bg2)',
          minHeight: 220,
        }}
        aria-label={`Ward map preview for ${cityName}`}
      >
        <svg
          viewBox="0 0 320 220"
          style={{ width: '100%', height: 220, display: 'block' }}
          role="img"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="ward-hatch"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--bg3)" strokeWidth="2" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="320" height="220" fill="url(#ward-hatch)" />
          <polygon
            points="60,40 240,30 280,90 270,160 200,190 100,180 40,120"
            fill="var(--bg1)"
            stroke="var(--civiq-blue)"
            strokeWidth="2"
            opacity="0.9"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'var(--bg2)',
            padding: '3px 7px',
            border: '1px solid var(--line)',
          }}
        >
          Schematic · placeholder
        </div>
      </div>
      <div
        style={{
          padding: '10px 14px',
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.5,
          borderTop: '1px solid var(--line)',
        }}
      >
        Coverage expanding · ward boundaries return when GIS layer lands.
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Static SVG district shape — boundary preview only. Real Mapbox/MapLibre
 * wiring is a follow-up PR (chat10 decision #8). Do NOT replace with a
 * real map in this PR — the placeholder is intentional.
 */

'use client';

import { districtDisplayLabel } from './data';
import type { ParsedDistrictId } from './data';

interface MapPlaceholderProps {
  parsed: ParsedDistrictId;
}

export function MapPlaceholder({ parsed }: MapPlaceholderProps) {
  const label = districtDisplayLabel(parsed);
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg2)',
        padding: 0,
        minHeight: 480,
      }}
      aria-label={`Boundary preview for ${label}`}
    >
      <svg
        viewBox="0 0 600 480"
        style={{ width: '100%', height: 480, display: 'block' }}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="diagonal-hatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--bg3)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="600" height="480" fill="url(#diagonal-hatch)" />
        {/* schematic district shape — abstract polygon, not a real boundary */}
        <polygon
          points="120,80 360,60 480,140 460,260 380,360 240,420 120,400 60,300 80,180"
          fill="var(--bg1)"
          stroke="var(--civiq-blue)"
          strokeWidth="3"
          opacity="0.92"
        />
        {/* district number stamp */}
        <g transform="translate(40, 40)">
          <rect x="0" y="0" width="86" height="28" fill="var(--ink)" />
          <text
            x="43"
            y="20"
            fill="var(--bg1)"
            fontSize="14"
            fontWeight="700"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            letterSpacing="0.08em"
          >
            {label}
          </text>
        </g>
        {/* compass */}
        <g transform="translate(540, 40)">
          <polygon points="0,-12 4,4 0,0 -4,4" fill="var(--fg1)" />
          <text x="-4" y="-16" fontSize="10" fill="var(--fg3)" fontFamily="var(--font-mono)">
            N
          </text>
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 14,
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'var(--bg2)',
          padding: '4px 8px',
          border: '1px solid var(--line)',
        }}
      >
        Boundary preview · static SVG
      </div>
    </div>
  );
}

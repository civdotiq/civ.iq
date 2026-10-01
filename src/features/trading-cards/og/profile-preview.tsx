/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress profile share image, 1200x630 (Satori). Photo-led so it reads
 * at feed-thumbnail size; every number carries its period. Party color
 * appears only in the identity band and the party word.
 */

import React from 'react';
import { formatCurrency, formatNumber, getPartyColor } from './shared';
import type { ProfilePreview } from './profile-preview-data';

const WIDTH = 1200;
const HEIGHT = 630;
const BAND = 10;
const FOOTER = 64;
const BODY = HEIGHT - BAND - FOOTER;
// The 450x550 roster photo, scaled to the body height.
const PHOTO_W = Math.round((BODY * 450) / 550);
const TEXT_PAD_X = 56;
const STAT_GAP = 28;
const STAT_W = Math.floor((WIDTH - PHOTO_W - 2 * TEXT_PAD_X - 2 * STAT_GAP) / 3);

function nameSize(name: string): number {
  if (name.length > 26) return 52;
  if (name.length > 18) return 62;
  return 76;
}

export function renderProfilePreview(p: ProfilePreview, photo?: string): React.ReactElement {
  const partyColor = getPartyColor(p.party);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', height: BAND, backgroundColor: partyColor }} />

      <div style={{ display: 'flex', height: BODY }}>
        {photo && (
          <img
            src={photo}
            alt=""
            width={PHOTO_W}
            height={BODY}
            style={{ width: PHOTO_W, height: BODY, objectFit: 'cover' }}
          />
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: `40px ${TEXT_PAD_X}px 32px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#4b5563',
            }}
          >
            <span style={{ color: partyColor }}>{p.party}</span>
            <span style={{ margin: '0 12px' }}>·</span>
            <span>{p.role}</span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: nameSize(p.name),
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              marginTop: 18,
            }}
          >
            {p.name}
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#374151', marginTop: 12 }}>
            {p.place}
          </div>

          <div style={{ display: 'flex', flex: 1 }} />

          {p.stats.length > 0 ? (
            <div style={{ display: 'flex', gap: STAT_GAP }}>
              {p.stats.map(s => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    // Fixed thirds, so one or two numbers don't stretch.
                    width: STAT_W,
                    borderTop: '2px solid #000000',
                    paddingTop: 12,
                  }}
                >
                  <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>
                    {s.kind === 'money' ? formatCurrency(s.value) : formatNumber(s.value)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}>{s.label}</span>
                  <span style={{ fontSize: 17, color: '#4b5563', marginTop: 2 }}>{s.period}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 26, color: '#374151' }}>
              Voting record, bills, campaign money and how to reach the office
            </div>
          )}

          {p.phone && (
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 28 }}>
              <span style={{ fontSize: 22, color: '#4b5563', marginRight: 12 }}>DC office</span>
              <span style={{ fontSize: 30, fontWeight: 700 }}>{p.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          height: FOOTER,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderTop: '2px solid #000000',
          fontSize: 20,
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>civdotiq.org</span>
        <span style={{ color: '#4b5563' }}>Sources: {p.sources.join(' · ')}</span>
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Share image for a page (state legislator, state hub, bill, vote, district),
 * 1200x630 (Satori). Same frame as the Congress profile card: a colour band,
 * an optional portrait, a kicker, the name of the thing, up to three facts,
 * and a footer naming the sources. Party colour appears only for a person.
 */

import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

export interface PageCardFact {
  value: string;
  label: string;
  detail?: string;
}

export interface PageCard {
  /** Short uppercase line above the title, e.g. "Michigan State Senator". */
  kicker: string;
  /** Party word shown in party colour at the start of the kicker. */
  party?: string;
  title: string;
  subtitle?: string;
  /** At most three; shown in fixed thirds along the bottom. */
  facts: PageCardFact[];
  /** Shown when there are no facts. */
  blurb?: string;
  /** One labelled line under the facts, e.g. a phone number. */
  line?: { label: string; value: string };
  /** Where the shown facts come from; only the sources actually used. */
  sources: string[];
}

export const PAGE_CARD_SIZE = { width: 1200, height: 630 };

const WIDTH = PAGE_CARD_SIZE.width;
const HEIGHT = PAGE_CARD_SIZE.height;
const BAND = 10;
const FOOTER = 64;
const BODY = HEIGHT - BAND - FOOTER;
const PHOTO_W = Math.round((BODY * 450) / 550);
const TEXT_PAD_X = 56;
const FACT_GAP = 28;

const NEUTRAL = '#111827';

/** Party colours (keep in sync with SEMANTIC_COLORS in '@/lib/constants/chart-colors'). */
function partyColor(party: string | undefined): string {
  const p = (party ?? '').toLowerCase();
  if (p.includes('democrat')) return '#2563eb';
  if (p.includes('republican')) return '#e11d07';
  return '#6b7280';
}

function titleSize(title: string, withPhoto: boolean): number {
  const n = title.length + (withPhoto ? 6 : 0);
  if (n > 40) return 48;
  if (n > 26) return 58;
  if (n > 18) return 68;
  return 80;
}

function factValueSize(value: string): number {
  if (value.length > 14) return 28;
  if (value.length > 8) return 36;
  return 48;
}

export function renderPageCard(card: PageCard, photo?: string): React.ReactElement {
  const band = card.party ? partyColor(card.party) : NEUTRAL;
  const textWidth = WIDTH - (photo ? PHOTO_W : 0) - 2 * TEXT_PAD_X;
  const factWidth = Math.floor((textWidth - 2 * FACT_GAP) / 3);

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        color: NEUTRAL,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', height: BAND, backgroundColor: band }} />

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
            {card.party && (
              <>
                <span style={{ color: band }}>{card.party}</span>
                <span style={{ margin: '0 12px' }}>·</span>
              </>
            )}
            <span>{card.kicker}</span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: titleSize(card.title, !!photo),
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              marginTop: 18,
            }}
          >
            {card.title}
          </div>
          {card.subtitle && (
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                lineHeight: 1.25,
                color: '#374151',
                marginTop: 14,
              }}
            >
              {card.subtitle}
            </div>
          )}

          <div style={{ display: 'flex', flex: 1 }} />

          {card.facts.length > 0 ? (
            <div style={{ display: 'flex', gap: FACT_GAP }}>
              {card.facts.slice(0, 3).map(f => (
                <div
                  key={f.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: factWidth,
                    borderTop: '2px solid #000000',
                    paddingTop: 12,
                  }}
                >
                  <span
                    style={{ fontSize: factValueSize(f.value), fontWeight: 700, lineHeight: 1 }}
                  >
                    {f.value}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}>{f.label}</span>
                  {f.detail && (
                    <span style={{ fontSize: 17, color: '#4b5563', marginTop: 2 }}>{f.detail}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            card.blurb && (
              <div style={{ display: 'flex', fontSize: 26, color: '#374151' }}>{card.blurb}</div>
            )
          )}

          {card.line && (
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 28 }}>
              <span style={{ fontSize: 22, color: '#4b5563', marginRight: 12 }}>
                {card.line.label}
              </span>
              <span style={{ fontSize: 30, fontWeight: 700 }}>{card.line.value}</span>
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
        {card.sources.length > 0 && (
          <span style={{ color: '#4b5563' }}>Sources: {card.sources.join(' · ')}</span>
        )}
      </div>
    </div>
  );
}

/** A day at the CDN; a fallback card only a minute, so the next scrape gets the full one. */
const FULL_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
const FALLBACK_CACHE = 'public, max-age=60, s-maxage=60';

/**
 * Render a card in the format the route declares (its `contentType` export).
 * Photo cards use JPEG: a photo-led PNG is ~600KB and WhatsApp drops previews
 * much over 300KB. Text-only cards stay PNG.
 */
export async function pageCardResponse(
  card: PageCard,
  {
    format,
    photo,
    fallback = false,
  }: { format: 'png' | 'jpeg'; photo?: string; fallback?: boolean }
): Promise<Response> {
  const cacheControl = fallback ? FALLBACK_CACHE : FULL_CACHE;
  const image = new ImageResponse(renderPageCard(card, photo), PAGE_CARD_SIZE);
  if (format === 'png') {
    return new Response(image.body, {
      headers: { 'Cache-Control': cacheControl, 'Content-Type': 'image/png' },
    });
  }
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { 'Cache-Control': cacheControl, 'Content-Type': 'image/jpeg' },
  });
}

/** Scrapers give up after a few seconds; past this the card falls back. */
export const PAGE_CARD_BUDGET_MS = 2000;

/**
 * The work's result, or null when it fails or outlasts the budget. The
 * caller keeps late work alive with `after()` so it still fills the cache
 * for the next scrape.
 */
export async function withinBudget<T>(
  work: Promise<T>,
  ms: number = PAGE_CARD_BUDGET_MS
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work.catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

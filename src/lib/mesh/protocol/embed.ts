/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Embeddable Widget Renderer
 *
 * Generates self-contained HTML for iframe embedding on external sites.
 * Uses Aicher/Ulm design system with inline styles (no external dependencies).
 */

/** Inline CSS following Aicher/Ulm design system */
const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Braun Linear', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-weight: 400;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fafafa;
  }
  .card {
    border: 2px solid #1a1a1a;
    padding: 16px;
    max-width: 360px;
  }
  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 2px solid #e5e5e5;
  }
  .card-row:last-of-type { border-bottom: none; }
  .card-label { color: #666; font-size: 13px; }
  .card-value { font-weight: 600; font-size: 14px; }
  .bar-track {
    width: 80px;
    height: 8px;
    background: #e5e5e5;
    display: inline-block;
    vertical-align: middle;
    margin-left: 8px;
  }
  .bar-fill { height: 100%; }
  .party-d { color: #0a9338; }
  .party-r { color: #e11d07; }
  .party-i { color: #3ea2d4; }
  .attribution {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 2px solid #e5e5e5;
    font-size: 11px;
    color: #999;
  }
  .attribution a { color: #3ea2d4; text-decoration: none; }
`;

import { displaySector } from '../sector-display';

export interface ScorecardData {
  name: string;
  party: string;
  state: string;
  district?: string;
  alignmentScore?: number;
  independenceScore?: number;
  topDonorSector?: string;
  dataAsOf: string;
}

export interface DistrictCardData {
  districtId: string;
  districtLabel: string;
  repAlignment?: number;
  peerAvg?: number;
  topSector?: string;
  dataAsOf: string;
}

/** Render a representative scorecard as self-contained HTML */
export function renderScorecard(data: ScorecardData): string {
  const partyClass = data.party === 'D' ? 'party-d' : data.party === 'R' ? 'party-r' : 'party-i';
  const partyLabel =
    data.party === 'D' ? 'Democrat' : data.party === 'R' ? 'Republican' : 'Independent';
  const districtLabel = data.district ? `${data.state}-${data.district}` : `${data.state}`;

  const alignmentBar = data.alignmentScore != null ? renderBar(data.alignmentScore) : 'N/A';
  const alignmentPct =
    data.alignmentScore != null ? `${Math.round(data.alignmentScore * 100)}%` : '';

  return wrapHtml(`
    <div class="card">
      <div class="card-title">${escapeHtml(data.name)} <span class="${partyClass}">(${escapeHtml(data.party)}-${escapeHtml(districtLabel)})</span></div>
      <div class="card-row">
        <span class="card-label">District Match</span>
        <span class="card-value">${alignmentPct} ${alignmentBar}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Votes Against Party</span>
        <span class="card-value">${data.independenceScore != null ? `${Math.round(data.independenceScore * 100)}%` : 'N/A'}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Top Donor Industry</span>
        <span class="card-value">${escapeHtml(data.topDonorSector ? displaySector(data.topDonorSector) : 'N/A')}</span>
      </div>
      <div class="attribution">
        Data: <a href="https://civ.iq" target="_blank" rel="noopener">CIV.IQ</a> &middot; ${escapeHtml(formatDate(data.dataAsOf))}
      </div>
    </div>
  `);
}

/** Render a district card as self-contained HTML */
export function renderDistrictCard(data: DistrictCardData): string {
  const alignmentBar = data.repAlignment != null ? renderBar(data.repAlignment) : '';
  const alignmentPct =
    data.repAlignment != null ? `${Math.round(data.repAlignment * 100)}%` : 'N/A';

  return wrapHtml(`
    <div class="card">
      <div class="card-title">${escapeHtml(data.districtId)} &middot; ${escapeHtml(data.districtLabel)}</div>
      <div class="card-row">
        <span class="card-label">Rep Match</span>
        <span class="card-value">${alignmentPct} ${alignmentBar}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Similar Districts Avg</span>
        <span class="card-value">${data.peerAvg != null ? `${Math.round(data.peerAvg * 100)}%` : 'N/A'}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Top Industry</span>
        <span class="card-value">${escapeHtml(data.topSector ? displaySector(data.topSector) : 'N/A')}</span>
      </div>
      <div class="attribution">
        Data: <a href="https://civ.iq" target="_blank" rel="noopener">CIV.IQ</a> &middot; ${escapeHtml(formatDate(data.dataAsOf))}
      </div>
    </div>
  `);
}

function renderBar(value: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const color = pct >= 70 ? '#0a9338' : pct >= 40 ? '#d4a03e' : '#e11d07';
  return `<span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>`;
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${BASE_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

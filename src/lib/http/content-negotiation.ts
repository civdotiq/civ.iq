/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Accept-header content negotiation (RFC 9110 §12.5.1).
 *
 * Used by middleware to decide when an agent should receive the
 * text/markdown variant of a page (acceptmarkdown.com convention) instead
 * of HTML. Edge-runtime safe: no Node APIs.
 */

interface MediaRange {
  type: string;
  subtype: string;
  q: number;
}

/** Parse an Accept header into media ranges with q-values. */
function parseAccept(accept: string): MediaRange[] {
  const ranges: MediaRange[] = [];
  for (const part of accept.split(',')) {
    const [media, ...params] = part.trim().split(';');
    if (!media) continue;
    const [type, subtype] = media.trim().toLowerCase().split('/');
    if (!type || !subtype) continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      if (key === 'q' && value !== undefined) {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) q = Math.min(Math.max(parsed, 0), 1);
      }
    }
    ranges.push({ type, subtype, q });
  }
  return ranges;
}

/**
 * Effective q-value for a concrete media type, honoring wildcard precedence:
 * an exact match outranks a subtype wildcard, which outranks the full
 * wildcard (RFC 9110 §12.5.1). Returns 0 when the type is not acceptable.
 */
function qualityFor(ranges: MediaRange[], type: string, subtype: string): number {
  let best: { specificity: number; q: number } | null = null;
  for (const range of ranges) {
    let specificity: number;
    if (range.type === type && range.subtype === subtype) specificity = 3;
    else if (range.type === type && range.subtype === '*') specificity = 2;
    else if (range.type === '*' && range.subtype === '*') specificity = 1;
    else continue;
    if (!best || specificity > best.specificity) {
      best = { specificity, q: range.q };
    }
  }
  return best?.q ?? 0;
}

/**
 * Should this request get the markdown variant?
 *
 * True only when the client names text/markdown explicitly (never via a
 * wildcard — browsers and curl send `*​/*` and must keep getting HTML) with
 * a q-value at least as high as what it would accept HTML at.
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const ranges = parseAccept(accept);
  const markdown = ranges.find(r => r.type === 'text' && r.subtype === 'markdown');
  if (!markdown || markdown.q === 0) return false;
  return markdown.q >= qualityFor(ranges, 'text', 'html');
}

/**
 * Does this client accept HTML (explicitly or via wildcard)?
 *
 * Browsers always do; agents and plain curl (`*​/*` counts) frequently do
 * not name it. Used to keep the designed HTML 404 page for humans while
 * agents get a recoverable markdown body — a bare `*​/*` is treated as NOT
 * an HTML request, since every browser names text/html explicitly.
 */
export function acceptsHtmlExplicitly(accept: string | null): boolean {
  if (!accept) return false;
  const ranges = parseAccept(accept);
  return ranges.some(
    r => r.type === 'text' && (r.subtype === 'html' || r.subtype === '*') && r.q > 0
  );
}

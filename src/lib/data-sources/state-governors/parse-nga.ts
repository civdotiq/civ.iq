/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Parsers for the National Governors Association's public governor pages
 * (nga.org/governors). Used only by scripts/sync-state-governors.ts; pages
 * read the committed src/data/state-governors.json instead.
 *
 * Why NGA rather than Wikidata: Wikidata's "head of government" for New
 * Hampshire still ranks Chris Sununu preferred (checked 2026-10-01), and its
 * lieutenant governor / attorney general / secretary of state queries return
 * nothing for any state. NGA's list is maintained by the governors' own
 * association and had all 55 current governors right.
 */

export interface NgaIndexEntry {
  /** As NGA prints it, e.g. "New Hampshire", "Northern Mariana Islands". */
  stateName: string;
  name: string;
  url: string;
}

export interface NgaTerm {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, or null for the term marked "Current". */
  end: string | null;
}

export interface NgaGovernorDetail {
  party: string | null;
  terms: NgaTerm[];
  website: string | null;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&#039;': "'",
  '&#8217;': '’',
  '&rsquo;': '’',
  '&quot;': '"',
  '&nbsp;': ' ',
};

function decode(text: string): string {
  return text.replace(/&(?:amp|#039|#8217|rsquo|quot|nbsp);/g, m => ENTITIES[m] ?? m);
}

/** Replace every tag with "|" (a linear scan; no backtracking regex). */
function stripTags(fragment: string): string {
  let out = '';
  let i = 0;
  while (i < fragment.length) {
    const open = fragment.indexOf('<', i);
    if (open < 0) return out + fragment.slice(i);
    const close = fragment.indexOf('>', open);
    if (close < 0) return out + fragment.slice(i);
    out += fragment.slice(i, open) + '|';
    i = close + 1;
  }
  return out;
}

function textParts(fragment: string): string[] {
  return decode(stripTags(fragment))
    .split('|')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** The "Current Governors" grid on nga.org/governors/. */
export function parseNgaIndex(html: string): NgaIndexEntry[] {
  const items = html.split('<li class="current-governors__item">').slice(1);
  return items.flatMap(item => {
    const url = /href="(https:\/\/www\.nga\.org\/governors\/[^"]+)"/.exec(item)?.[1];
    const stateName = /<small class="state">([^<]+)<\/small>/.exec(item)?.[1];
    const nameText = /<small class="state">[^<]*<\/small>([^<]*)</.exec(item)?.[1];
    if (!url || !stateName || !nameText) return [];
    const name = decode(nameText)
      .replace(/^\s*Gov\.\s*/, '')
      .trim();
    return name ? [{ stateName: decode(stateName).trim(), name, url }] : [];
  });
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** "January 9, 2025" → "2025-01-09"; null when unparseable. */
export function parseNgaDate(text: string): string | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]!.toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
}

/** The value block that follows `<label class="label">{label}</label>`. */
function labelled(html: string, label: string): string[] {
  const tag = `<label class="label">${label}</label>`;
  const start = html.indexOf(tag);
  if (start < 0) return [];
  const rest = html.slice(start + tag.length);
  const next = rest.indexOf('<label class="label">');
  return textParts(next >= 0 ? rest.slice(0, next) : rest.slice(0, 2000));
}

/** One governor's page, e.g. nga.org/governors/new-hampshire/. */
export function parseNgaGovernorPage(html: string): NgaGovernorDetail {
  const party = labelled(html, 'Party')[0] ?? null;
  const terms = labelled(html, 'Terms').flatMap((line): NgaTerm[] => {
    // textParts has already collapsed whitespace to single spaces.
    const [from, to] = line.split(' - ');
    const start = from ? parseNgaDate(from) : null;
    if (!start || !to) return [];
    if (/^current$/i.test(to.trim())) return [{ start, end: null }];
    const end = parseNgaDate(to);
    return end ? [{ start, end }] : [];
  });
  const website =
    /<a href="(https?:\/\/[^"]+)">Governor(?:&#039;|'|’)s Website<\/a>/.exec(html)?.[1] ?? null;
  return { party, terms, website };
}

/** NGA spells it "Democrat" on at least one page; the rest say "Democratic". */
export function normalizeGovernorParty(party: string | null): string | null {
  if (!party) return null;
  const p = party.trim();
  if (/^democrat(ic)?$/i.test(p)) return 'Democratic';
  if (/^republican$/i.test(p)) return 'Republican';
  return p;
}

const DAY_MS = 86_400_000;

/**
 * Start of the unbroken run of terms ending in the current one. Consecutive
 * terms abut within a few days (TX: Jan 7 → Jan 8); a gap of more than 31
 * days means non-consecutive service, so the earlier stint doesn't count.
 */
export function inOfficeSince(terms: NgaTerm[]): string | null {
  const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
  const current = sorted.findIndex(t => t.end === null);
  if (current < 0) return null;
  let since = sorted[current]!.start;
  for (let i = current - 1; i >= 0; i--) {
    const end = sorted[i]!.end;
    if (!end || Date.parse(since) - Date.parse(end) > 31 * DAY_MS) break;
    since = sorted[i]!.start;
  }
  return since;
}

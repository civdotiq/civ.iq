/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Map Census state legislative district GEOIDs to the district strings the
 * OpenStates roster corpus uses.
 *
 * The Census geocoder names an address's districts by GEOID ("27062A") and a
 * label ("State House District 62A"); the corpus names a member's seat the way
 * the legislature does ("62A", "7th Hampden", "Chittenden-17", "Ward 1"). The
 * two schemes agree once the labels' prefixes are stripped in most states, but
 * not all of them, and the old runtime matcher (first run of digits) collapsed
 * 62A with 62B and every "7th ..." district with every other. Building the map
 * once, against the real corpus, turns every mismatch into a build-time report
 * instead of a wrong answer at lookup time.
 *
 * Pure: the script feeds it the Census relationship files and the corpus.
 */

export type SldChamber = 'upper' | 'lower';

export interface CensusSld {
  geoid: string;
  /** Census NAMELSAD, e.g. "State House District 62A". */
  name: string;
  chamber: SldChamber;
}

export interface CorpusSeat {
  /** USPS code. */
  state: string;
  chamber: 'upper' | 'lower' | 'legislature';
  district: string;
}

/** One GEOID's corpus district(s). Several when one Census district elects by sub-seat (Idaho 16A/16B). */
export type SldKey = string | string[];

export interface SldKeyReport {
  /** `${state}-${chamber}` → Census labels no corpus district matched. */
  unmapped: Record<string, string[]>;
  /** `${state}-${chamber}` → numbered districts mapped with no sitting member (vacancies). */
  noSittingMember: Record<string, string[]>;
  /** `${state}-${chamber}` → corpus districts no GEOID reaches. */
  unreached: Record<string, string[]>;
}

export interface SldKeyBuild {
  upper: Record<string, SldKey>;
  lower: Record<string, SldKey>;
  report: SldKeyReport;
}

/**
 * Where the Census and legislature spell the same district differently and no
 * general rule reconciles them. Keyed `${state}-${chamber}`, Census label (after
 * `censusLabel`) → corpus district. Every entry must name a real corpus
 * district; the build throws otherwise.
 */
export const SLD_NAME_ALIASES: Record<string, Record<string, string>> = {
  'VT-upper': { 'Chittenden South East': 'Chittenden Southeast' },
};

/**
 * Label shapes that are unambiguous district names on their own: numbered or
 * lettered ("62A", "K") and Massachusetts's ordinal-county House districts
 * ("16th Middlesex"). A label of one of these shapes with no corpus member is a
 * vacant seat (or one upstream hasn't filled in yet), not a naming mismatch.
 */
const SELF_NAMING_LABEL = /^(\d+[A-Z]?|[A-Z]|\d+(?:st|nd|rd|th) [A-Z][a-z]+|[A-Z][a-z]+ \d+)$/;

/**
 * Districts that are not places: seats every address in the jurisdiction
 * shares (DC's at-large councilmembers and chair, Puerto Rico's at-large
 * legislators) and Maine's non-voting tribal representatives. No GEOID should
 * reach them, so they are left out of the "unreached" report.
 */
export function isNonGeographicDistrict(district: string): boolean {
  return (
    /^(at-large|chairman)$/i.test(district.trim()) || /\b(tribe|nation|band)\b/i.test(district)
  );
}

/** A Census label reduced to the part a legislature would print. */
export function censusLabel(name: string): string {
  let s = name.trim();
  // Suffix forms: "1st Barnstable District", "Addison-1 State House District",
  // "Addison Senatorial District".
  s = s.replace(/\s+(?:State House |State Senate |Senatorial )?District$/i, '');
  // Prefix forms: "State Senate District 12", "Assembly District 01",
  // "Legislative (House) District 1", "State House District Belknap 01".
  const prefixed = s.match(/\b(?:Sub)?[Dd]istrict\s+(.+)$/);
  if (prefixed?.[1]) s = prefixed[1];
  // Zero padding: "01" → "1", "Belknap 01" → "Belknap 1", "062A" → "62A".
  return s.replace(/^0+(?=[0-9A-Z])/, '').replace(/(\s|-)0+(?=\d)/g, '$1');
}

/** Case-, punctuation- and "and"-insensitive comparison key. */
function looseKey(label: string): string {
  return label
    .toLowerCase()
    .split(/[\s,\-]+/)
    .filter(t => t && t !== 'and')
    .join(' ');
}

function corpusChamberMatches(census: SldChamber, corpus: CorpusSeat['chamber']): boolean {
  // Unicameral bodies (Nebraska, DC) appear in the Census upper-chamber layer only.
  return census === 'upper' ? corpus === 'upper' || corpus === 'legislature' : corpus === 'lower';
}

export function buildSldDistrictKeys(
  census: CensusSld[],
  corpus: CorpusSeat[],
  fipsToState: Record<string, string>,
  aliases: Record<string, Record<string, string>> = SLD_NAME_ALIASES
): SldKeyBuild {
  const out: SldKeyBuild = {
    upper: {},
    lower: {},
    report: { unmapped: {}, noSittingMember: {}, unreached: {} },
  };

  // `${state}-${chamber}` → the corpus's distinct district strings.
  const seats = new Map<string, Set<string>>();
  for (const s of corpus) {
    for (const chamber of ['upper', 'lower'] as const) {
      if (!corpusChamberMatches(chamber, s.chamber)) continue;
      const k = `${s.state}-${chamber}`;
      if (!seats.has(k)) seats.set(k, new Set());
      seats.get(k)!.add(s.district);
    }
  }

  for (const [group, table] of Object.entries(aliases)) {
    for (const target of Object.values(table)) {
      if (!seats.get(group)?.has(target)) {
        throw new Error(`SLD alias ${group} → "${target}" is not a corpus district`);
      }
    }
  }

  const reached = new Map<string, Set<string>>();
  const push = (bucket: Record<string, string[]>, group: string, value: string) => {
    (bucket[group] ??= []).push(value);
  };

  for (const d of census) {
    const state = fipsToState[d.geoid.slice(0, 2)];
    if (!state) continue;
    const group = `${state}-${d.chamber}`;
    const districts = seats.get(group) ?? new Set<string>();
    const label = censusLabel(d.name);

    let hit: string[] = [];
    const alias = aliases[group]?.[label];
    if (alias) hit = [alias];
    else if (districts.has(label)) hit = [label];
    else {
      const loose = looseKey(label);
      hit = [...districts].filter(x => looseKey(x) === loose);
      // One Census district holding lettered sub-seats: Idaho House 16 → 16A, 16B.
      if (hit.length === 0 && /^\d+$/.test(label)) {
        hit = [...districts].filter(x => new RegExp(`^${label}[A-Z]$`).test(x)).sort();
      }
    }

    if (hit.length === 0) {
      // Key a vacant seat anyway so the lookup can say "no sitting member".
      if (SELF_NAMING_LABEL.test(label) && districts.size > 0) {
        out[d.chamber][d.geoid] = label;
        push(out.report.noSittingMember, group, label);
      } else {
        push(out.report.unmapped, group, d.name);
      }
      continue;
    }

    out[d.chamber][d.geoid] = hit.length === 1 ? hit[0]! : hit;
    if (!reached.has(group)) reached.set(group, new Set());
    for (const h of hit) reached.get(group)!.add(h);
  }

  for (const [group, districts] of seats) {
    const missing = [...districts].filter(
      x => !isNonGeographicDistrict(x) && !reached.get(group)?.has(x)
    );
    if (missing.length > 0) out.report.unreached[group] = missing.sort();
  }

  return out;
}

/**
 * Congressional Vacancies Sync
 *
 * Fetches the "Changes in membership" section from Wikipedia's current Congress
 * article, parses the wikitext tables, and writes src/lib/data/vacancies.json.
 * Runs weekly via .github/workflows/sync-vacancies.yml and opens a PR when the
 * file changes so a human reviews before merge.
 *
 * Usage:
 *   npx tsx scripts/sync-vacancies.ts                # write updated JSON
 *   npx tsx scripts/sync-vacancies.ts --dry-run      # preview, no write
 *   npx tsx scripts/sync-vacancies.ts --fixture PATH # parse a local wikitext file
 *
 * Source: https://en.wikipedia.org/wiki/119th_United_States_Congress
 */

import fs from 'fs';
import path from 'path';

const WIKI_PAGE = '119th_United_States_Congress';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const OUTPUT_PATH = path.join(process.cwd(), 'src/lib/data/vacancies.json');
const CONGRESS = 119;

interface Vacancy {
  state: string;
  chamber: 'House' | 'Senate';
  district: string | null;
  senateClass: '1' | '2' | '3' | null;
  vacantSince: string | null;
  reason: 'death' | 'resignation' | 'expulsion' | 'executive_appointment' | 'other';
  reasonDetail?: string;
  previousMember: { name: string; party: string; bioguideId?: string };
  specialElection?: { date: string | null; runoffDate?: string | null; notes?: string };
  successor?: {
    name: string;
    party: string;
    bioguideId?: string;
    installedDate: string | null;
    method: 'appointed' | 'elected';
    notes?: string;
  };
  notes?: string;
}

interface VacanciesFile {
  congress: number;
  lastUpdated: string;
  source: string;
  vacancies: Vacancy[];
}

async function fetchChangesWikitext(): Promise<string> {
  const sectionsUrl = `${WIKI_API}?action=parse&page=${WIKI_PAGE}&format=json&prop=sections&origin=*`;
  const sectionsRes = await fetch(sectionsUrl);
  if (!sectionsRes.ok) throw new Error(`Failed to fetch sections: ${sectionsRes.status}`);
  const sectionsData = (await sectionsRes.json()) as {
    parse: { sections: Array<{ index: string; line: string }> };
  };
  const section = sectionsData.parse.sections.find(s => s.line === 'Changes in membership');
  if (!section) throw new Error('Could not locate "Changes in membership" section on Wikipedia');

  const wtUrl = `${WIKI_API}?action=parse&page=${WIKI_PAGE}&format=json&prop=wikitext&section=${section.index}&origin=*`;
  const wtRes = await fetch(wtUrl);
  if (!wtRes.ok) throw new Error(`Failed to fetch wikitext: ${wtRes.status}`);
  const wtData = (await wtRes.json()) as { parse: { wikitext: { '*': string } } };
  return wtData.parse.wikitext['*'];
}

function stripRefs(s: string): string {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<ref[^/]*\/>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSortname(cell: string): string | null {
  const m = cell.match(/\{\{Sortname\|([^|}]+)\|([^|}]+)(?:\|[^}]*)?\}\}/);
  if (!m) return null;
  return `${m[1].trim()} ${m[2].trim()}`;
}

function extractParty(cell: string): string | null {
  const m = cell.match(/\{\{Party shading\/([A-Za-z]+)/);
  if (!m) return null;
  return m[1] === 'Democratic' ? 'Democrat' : m[1];
}

function extractUshr(cell: string): { state: string; district: string } | null {
  const m = cell.match(/\{\{Ushr\|([A-Z]{2})\|(\d{1,2})\|/);
  if (!m) return null;
  return { state: m[1], district: m[2].padStart(2, '0') };
}

function extractSenateState(
  cell: string
): { state: string; senateClass: '1' | '2' | '3' | null } | null {
  const nameMatch = cell.match(/\[\[List of United States senators from ([A-Za-z ]+)\|/);
  if (!nameMatch) return null;
  const stateCode = stateNameToCode(nameMatch[1].trim());
  if (!stateCode) return null;
  const classMatch = cell.match(/\((\d)\)/);
  const sc = classMatch ? classMatch[1] : null;
  return {
    state: stateCode,
    senateClass: sc === '1' || sc === '2' || sc === '3' ? sc : null,
  };
}

function stateNameToCode(name: string): string | null {
  const map: Record<string, string> = {
    Alabama: 'AL',
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Colorado: 'CO',
    Connecticut: 'CT',
    Delaware: 'DE',
    Florida: 'FL',
    Georgia: 'GA',
    Hawaii: 'HI',
    Idaho: 'ID',
    Illinois: 'IL',
    Indiana: 'IN',
    Iowa: 'IA',
    Kansas: 'KS',
    Kentucky: 'KY',
    Louisiana: 'LA',
    Maine: 'ME',
    Maryland: 'MD',
    Massachusetts: 'MA',
    Michigan: 'MI',
    Minnesota: 'MN',
    Mississippi: 'MS',
    Missouri: 'MO',
    Montana: 'MT',
    Nebraska: 'NE',
    Nevada: 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oklahoma: 'OK',
    Oregon: 'OR',
    Pennsylvania: 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Vermont: 'VT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wisconsin: 'WI',
    Wyoming: 'WY',
  };
  return map[name] ?? null;
}

const MONTHS: Record<string, string> = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
};

function parseDate(raw: string): string | null {
  const m = raw.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/
  );
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, '0')}`;
}

function inferReason(reasonCell: string): {
  reason: Vacancy['reason'];
  detail?: string;
  vacantSince: string | null;
} {
  const text = stripRefs(reasonCell);
  const lower = text.toLowerCase();

  let reason: Vacancy['reason'] = 'other';
  if (/\bdied\b|\bdeath\b/.test(lower)) reason = 'death';
  else if (/\bexpelled\b|\bexpulsion\b/.test(lower)) reason = 'expulsion';
  else if (
    /\bto become\b[^.]*\b(vice president|secretary|national security advisor|chief of staff|ambassador|director)\b/i.test(
      text
    )
  )
    reason = 'executive_appointment';
  else if (/\bresign(?:ed|ing)?\b/i.test(text) || /\bto resign\b/i.test(text))
    reason = 'resignation';

  const resignedMatch = text.match(
    /resigned\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
  );
  const diedMatch = text.match(
    /died\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
  );
  const vacantSince = resignedMatch
    ? parseDate(resignedMatch[1])
    : diedMatch
      ? parseDate(diedMatch[1])
      : null;

  const detail = text.split(/\s*A special election/)[0]?.trim();
  return { reason, detail: detail || undefined, vacantSince };
}

function isPartySwitch(reasonCell: string): boolean {
  return /\bchanged party\b|\bparty switch\b/i.test(stripRefs(reasonCell));
}

function parseSpecialElection(reasonCell: string): Vacancy['specialElection'] | undefined {
  const text = stripRefs(reasonCell);
  const primary = text.match(
    /special election\s+(?:was|will be)\s+held(?:\s+on)?\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
  );
  const runoff = text.match(
    /runoff\s+(?:was|will be)\s+held(?:\s+on)?\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i
  );
  if (!primary && !runoff) return undefined;
  return {
    date: primary ? parseDate(primary[1]) : null,
    runoffDate: runoff ? parseDate(runoff[1]) : null,
  };
}

function splitRows(wikitext: string): string[][] {
  const chunks = wikitext.split(/^\|-\s*$/m);
  const rows: string[][] = [];
  for (const chunk of chunks) {
    const cells: string[] = [];
    let current = '';
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (/^\s*[!|]/.test(line) && !line.startsWith('|}') && !line.startsWith('|-')) {
        if (current) cells.push(current.trim());
        current = line.replace(/^\s*[!|]\s*/, '');
      } else if (current !== '') {
        current += '\n' + line;
      }
    }
    if (current) cells.push(current.trim());
    if (cells.length >= 3) rows.push(cells);
  }
  return rows;
}

function parseRow(cells: string[], chamber: 'House' | 'Senate'): Vacancy | null {
  const [seatCell, prevCell, reasonCell, successorCell, dateCell] = cells;
  if (!seatCell || !prevCell || !reasonCell) return null;
  if (isPartySwitch(reasonCell)) return null;

  let state = '';
  let district: string | null = null;
  let senateClass: '1' | '2' | '3' | null = null;

  if (chamber === 'House') {
    const u = extractUshr(seatCell);
    if (!u) return null;
    state = u.state;
    district = u.district;
  } else {
    const s = extractSenateState(seatCell);
    if (!s) return null;
    state = s.state;
    senateClass = s.senateClass;
  }

  let prevName = extractSortname(prevCell);
  let prevParty = extractParty(prevCell);
  if (!prevName && prevCell.toLowerCase().includes('vacant')) {
    const m = stripRefs(reasonCell).match(
      /^\s*([A-Z][A-Za-zÀ-ÿ.'-]+(?:\s+[A-Z][A-Za-zÀ-ÿ.'-]+)+)\s+\(([RDI])\)/
    );
    if (m) {
      prevName = m[1];
      prevParty = m[2] === 'R' ? 'Republican' : m[2] === 'D' ? 'Democrat' : 'Independent';
    } else {
      prevName = 'Vacant';
    }
  }
  if (!prevName) return null;
  if (!prevParty) prevParty = 'N/A';

  const { reason, detail, vacantSince } = inferReason(reasonCell);
  const specialElection = parseSpecialElection(reasonCell);

  const successorName = successorCell ? extractSortname(successorCell) : null;
  const successorParty = successorCell ? extractParty(successorCell) : null;
  const installedDate = dateCell ? parseDate(stripRefs(dateCell)) : null;

  const vacancy: Vacancy = {
    state,
    chamber,
    district,
    senateClass,
    vacantSince,
    reason,
    previousMember: { name: prevName, party: prevParty },
  };
  if (detail) vacancy.reasonDetail = detail;
  if (specialElection) vacancy.specialElection = specialElection;
  if (successorName && successorParty) {
    const method: 'appointed' | 'elected' =
      /appointed/i.test(stripRefs(reasonCell)) && !/elected/i.test(stripRefs(reasonCell))
        ? 'appointed'
        : 'elected';
    vacancy.successor = {
      name: successorName,
      party: successorParty,
      installedDate,
      method,
    };
  }
  return vacancy;
}

function extractSection(wikitext: string, heading: string): string {
  const re = new RegExp(`===${heading}===([\\s\\S]*?)(?:===|$)`);
  const m = wikitext.match(re);
  return m ? m[1] : '';
}

function parseWikitext(wikitext: string): Vacancy[] {
  const senateSection = extractSection(wikitext, 'Senate membership changes');
  const houseSection = extractSection(wikitext, 'House membership changes');

  const senateRows = splitRows(senateSection);
  const houseRows = splitRows(houseSection);

  const vacancies: Vacancy[] = [];
  for (const row of senateRows) {
    const v = parseRow(row, 'Senate');
    if (v) vacancies.push(v);
  }
  for (const row of houseRows) {
    const v = parseRow(row, 'House');
    if (v) vacancies.push(v);
  }
  return vacancies;
}

function mergeWithExisting(parsed: Vacancy[], existing: VacanciesFile): Vacancy[] {
  return parsed.map(p => {
    const match = existing.vacancies.find(
      e =>
        e.chamber === p.chamber &&
        e.state === p.state &&
        (e.district ?? '') === (p.district ?? '') &&
        (e.senateClass ?? '') === (p.senateClass ?? '') &&
        e.previousMember.name.toLowerCase() === p.previousMember.name.toLowerCase()
    );
    if (!match) return p;
    return {
      ...p,
      previousMember: {
        ...p.previousMember,
        bioguideId: match.previousMember.bioguideId ?? p.previousMember.bioguideId,
      },
      successor:
        p.successor && match.successor
          ? { ...p.successor, bioguideId: match.successor.bioguideId ?? p.successor.bioguideId }
          : p.successor,
      notes: match.notes ?? p.notes,
    };
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fixtureIdx = args.indexOf('--fixture');
  const fixture = fixtureIdx >= 0 ? args[fixtureIdx + 1] : null;

  const wikitext = fixture ? fs.readFileSync(fixture, 'utf8') : await fetchChangesWikitext();
  const parsed = parseWikitext(wikitext);

  if (parsed.length === 0) {
    console.error('No vacancies parsed — aborting to avoid wiping the file.');
    process.exit(1);
  }

  const existingRaw = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
  const existing: VacanciesFile | null = existingRaw ? JSON.parse(existingRaw) : null;
  const merged = existing ? mergeWithExisting(parsed, existing) : parsed;

  const output: VacanciesFile = {
    congress: CONGRESS,
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: `https://en.wikipedia.org/wiki/${WIKI_PAGE}#Changes_in_membership`,
    vacancies: merged,
  };

  const serialized = JSON.stringify(output, null, 2) + '\n';

  console.log(
    `Parsed ${parsed.length} vacancies (${parsed.filter(v => v.chamber === 'Senate').length} Senate, ${parsed.filter(v => v.chamber === 'House').length} House).`
  );

  if (dryRun) {
    console.log('--dry-run: not writing output.');
    console.log(serialized);
    return;
  }

  if (existingRaw === serialized) {
    console.log('No changes.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, serialized);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

/**
 * Vote Service - Shared data fetching for vote details
 * Used by both API routes and server components
 *
 * This is a thin wrapper that imports the parsing logic from the API route
 * to avoid duplicating ~1000 lines of XML parsing code.
 */

import { XMLParser } from 'fast-xml-parser';
import logger from '@/lib/logging/simple-logger';
import { getLegislatorInfoMap, getSenatorBioguideLookup } from '@/lib/data/legislator-mappings';
import { getRedisCache } from '@/lib/cache/redis-client';
import { isSenateXmlDisabled } from '@/features/representatives/services/batch-voting-service';
import {
  expandRoll,
  getSenateVoteMenu,
  rollKey,
  type CompactRollCall,
} from '@/features/representatives/services/roll-call-corpus';

// Types for vote data
export interface UnifiedVoteDetail {
  voteId: string;
  congress: string;
  session: string;
  rollNumber: number;
  date: string;
  time?: string;
  title: string;
  question: string;
  description: string;
  /** Formal procedural text describing the measure (from Senate XML vote_document_text) */
  documentText?: string;
  result: string;
  chamber: 'House' | 'Senate';
  yeas: number;
  nays: number;
  present: number;
  absent: number;
  totalVotes: number;
  requiredMajority?: string;
  members: MemberVote[];
  bill?: {
    number: string;
    title: string;
    type: string;
    url?: string;
    summary?: string;
  };
  amendment?: {
    number: string;
    purpose: string;
  };
  metadata: {
    source: string;
    confidence: string;
    processingDate: string;
    xmlUrl?: string;
    apiUrl?: string;
  };
}

export interface MemberVote {
  id: string;
  bioguideId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  state: string;
  party: 'D' | 'R' | 'I';
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  district?: string;
}

interface SenatorVote extends MemberVote {
  lisId: string;
}

/**
 * Normalize a raw chamber vote string to the four-member position union.
 * Senate XML emits values like "Present, Giving Live Pair" and, on
 * impeachment articles, "Guilty"/"Not Guilty".
 */
function normalizeVotePosition(raw: string): MemberVote['position'] {
  const pos = raw.toLowerCase().trim();
  if (pos === 'yea' || pos === 'aye' || pos === 'yes' || pos === 'guilty') return 'Yea';
  if (pos === 'nay' || pos === 'no' || pos === 'not guilty') return 'Nay';
  if (pos.includes('present')) return 'Present';
  return 'Not Voting';
}

/**
 * Sessions to try when a vote ID carries no session. Roll-call numbers
 * restart at 1 each session, so order matters: during a congress's second
 * (even) year, new votes live in session 2 — try it first so current links
 * resolve correctly, falling back to session 1 for older roll numbers.
 */
export function sessionsToTry(congress: string, session?: string): number[] {
  if (session === '1' || session === '2') return [parseInt(session, 10)];
  const congressNum = parseInt(congress, 10);
  if (!Number.isFinite(congressNum)) return [1, 2];
  const sessionOneYear = 1789 + (congressNum - 1) * 2;
  return new Date().getFullYear() === sessionOneYear + 1 ? [2, 1] : [1, 2];
}

// Parse vote ID to determine chamber
export function parseVoteId(voteId: string): {
  chamber: 'House' | 'Senate';
  congress: string;
  session?: string;
  rollNumber: string;
  numericId: string;
} {
  // "house-119-1-100" (congress-session-roll, emitted by sitemap vote URLs)
  const houseSessionMatch = voteId.match(/^house-(\d+)-([12])-(\d+)$/);
  if (houseSessionMatch && houseSessionMatch[1] && houseSessionMatch[3]) {
    return {
      chamber: 'House',
      congress: houseSessionMatch[1],
      session: houseSessionMatch[2],
      rollNumber: houseSessionMatch[3],
      numericId: houseSessionMatch[3],
    };
  }

  const houseMatch = voteId.match(/^house-(\d+)-(\d+)$/);
  if (houseMatch && houseMatch[1] && houseMatch[2]) {
    return {
      chamber: 'House',
      congress: houseMatch[1],
      rollNumber: houseMatch[2],
      numericId: houseMatch[2],
    };
  }

  // "senate-119-2-00042" (congress-session-roll, emitted by batch-voting-service)
  const senateSessionMatch = voteId.match(/^senate-(\d+)-([12])-(\d+)$/);
  if (senateSessionMatch && senateSessionMatch[1] && senateSessionMatch[3]) {
    return {
      chamber: 'Senate',
      congress: senateSessionMatch[1],
      session: senateSessionMatch[2],
      rollNumber: senateSessionMatch[3],
      numericId: senateSessionMatch[3],
    };
  }

  // "senate-119-42" (congress-roll, public v1 format)
  const senatePrefixMatch = voteId.match(/^senate-(\d+)-(\d+)$/);
  if (senatePrefixMatch && senatePrefixMatch[1] && senatePrefixMatch[2]) {
    return {
      chamber: 'Senate',
      congress: senatePrefixMatch[1],
      rollNumber: senatePrefixMatch[2],
      numericId: senatePrefixMatch[2],
    };
  }

  // "119-senate-00499" or bare numeric "499"
  const senateMatch = voteId.match(/^(?:(\d+)-senate-)?(\d+)$/);
  if (senateMatch && senateMatch[2]) {
    return {
      chamber: 'Senate',
      congress: senateMatch[1] || '119',
      rollNumber: senateMatch[2],
      numericId: senateMatch[2],
    };
  }

  const numericMatch = voteId.match(/(\d+)$/);
  return {
    chamber: 'Senate',
    congress: '119',
    rollNumber: numericMatch?.[1] || voteId,
    numericId: numericMatch?.[1] || voteId,
  };
}

// Fetch bill data from Congress.gov
async function fetchBillData(congress: string, billType: string, billNumber: string) {
  try {
    const typeSlug = billType.toLowerCase();
    const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${typeSlug}/${billNumber}?format=json`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/2.0',
        'X-API-Key': process.env.CONGRESS_API_KEY || '',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return { title: null, summary: null };

    const data = await response.json();
    const title = data.bill?.title || null;
    let summary: string | null = null;
    if (data.bill?.summaries?.[0]?.text) {
      summary = data.bill.summaries[0].text.replace(/<[^>]*>/g, '').trim();
    }
    return { title, summary };
  } catch {
    return { title: null, summary: null };
  }
}

// Parse House vote XML
async function parseHouseVoteXML(sourceDataURL: string): Promise<MemberVote[]> {
  try {
    const response = await fetch(sourceDataURL);
    if (!response.ok) return [];

    const xmlText = await response.text();
    if (!xmlText.includes('<legislator') || !xmlText.includes('<vote>')) return [];

    const memberPattern =
      /<recorded-vote><legislator name-id="([^"]+)"([^>]*)>([^<]*)<\/legislator><vote>([^<]+)<\/vote><\/recorded-vote>/gi;
    const members: MemberVote[] = [];
    let match;

    while ((match = memberPattern.exec(xmlText)) !== null) {
      const [, bioguideId, attributes, memberInfo, votePosition] = match;
      if (!bioguideId || !votePosition) continue;

      const nameMatch = memberInfo?.match(/([^,]+)/);
      const fullName = nameMatch?.[1]?.trim() || 'Unknown';
      const nameParts = fullName.split(' ');

      // Clerk XML carries party/state on the legislator element
      const partyAttr = attributes?.match(/party="([^"]*)"/)?.[1]?.trim() ?? '';
      const party: MemberVote['party'] = partyAttr === 'D' || partyAttr === 'R' ? partyAttr : 'I';
      const state = attributes?.match(/state="([^"]*)"/)?.[1]?.trim() || 'Unknown';

      members.push({
        id: bioguideId,
        bioguideId,
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || 'Unknown',
        fullName,
        state,
        party,
        position: normalizeVotePosition(votePosition),
      });
    }
    return members;
  } catch {
    return [];
  }
}

// Parse House vote from Congress.gov API
async function parseHouseVote(
  voteId: string,
  congress: string,
  rollNumber: string,
  knownSession?: string
): Promise<UnifiedVoteDetail | null> {
  try {
    const sessions = sessionsToTry(congress, knownSession);
    let response: Response | null = null;
    let sessionNumber = sessions[0] ?? 1;
    let apiUrl = '';

    for (const session of sessions) {
      apiUrl = `https://api.congress.gov/v3/house-vote/${congress}/${session}/${rollNumber}?format=json`;
      response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'CivIQ-Hub/2.0',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        sessionNumber = session;
        break;
      }
    }

    if (!response?.ok) return null;

    const apiData = await response.json();
    const vote = apiData.houseRollCallVote;
    if (!vote) return null;

    let yeas = 0,
      nays = 0,
      present = 0,
      absent = 0;
    if (vote.votePartyTotal) {
      for (const pt of vote.votePartyTotal) {
        yeas += pt.yeaTotal || 0;
        nays += pt.nayTotal || 0;
        present += pt.presentTotal || 0;
        absent += pt.notVotingTotal || 0;
      }
    }

    const hasBillInfo = vote.legislationType && vote.legislationNumber;
    const [billData, members] = await Promise.all([
      hasBillInfo
        ? fetchBillData(congress, vote.legislationType, vote.legislationNumber)
        : { title: null, summary: null },
      (async () => {
        if (!vote.sourceDataURL) return [];
        const m = await parseHouseVoteXML(vote.sourceDataURL);
        const legislatorInfoMap = await getLegislatorInfoMap();
        return m.map(member => {
          const info = member.bioguideId ? legislatorInfoMap.get(member.bioguideId) : null;
          return info
            ? {
                ...member,
                firstName: info.firstName,
                lastName: info.lastName,
                fullName: info.fullName,
                state: info.state,
                party: info.party,
                district: info.district?.toString(),
              }
            : member;
        });
      })(),
    ]);

    return {
      voteId,
      congress,
      session: String(vote.sessionNumber || sessionNumber),
      rollNumber: parseInt(rollNumber),
      date: String(vote.startDate || ''),
      title: String(vote.voteQuestion || 'House Vote'),
      question: String(vote.voteQuestion || ''),
      description: String(vote.voteQuestion || ''),
      result: String(vote.result || 'Unknown'),
      chamber: 'House',
      yeas,
      nays,
      present,
      absent,
      totalVotes: yeas + nays + present + absent,
      members,
      bill: hasBillInfo
        ? {
            number: vote.legislationNumber,
            title: billData.title || `${vote.legislationType} ${vote.legislationNumber}`,
            type: vote.legislationType,
            url: vote.legislationUrl,
            summary: billData.summary || undefined,
          }
        : undefined,
      metadata: {
        source: 'congress-api',
        confidence: 'high',
        processingDate: new Date().toISOString(),
        apiUrl,
        xmlUrl: vote.sourceDataURL || '',
      },
    };
  } catch (error) {
    logger.error('Error parsing House vote', error as Error, { voteId });
    return null;
  }
}

/**
 * Build a Senate vote detail from the mirrored roll-call corpus (MR10) —
 * used where senate.gov XML is unreachable (Akamai blocks cloud IPs) or
 * missing. Member positions come from the persisted compact roll (official
 * XML, relayed by the sync workflow); names/states are hydrated from the
 * legislator dataset; question/result/title come from the mirrored menu.
 * Fields the corpus doesn't carry (vote time, document text, amendment,
 * required majority) are honestly absent.
 */
async function senateVoteFromCorpus(
  voteId: string,
  congress: string,
  knownSession?: string
): Promise<UnifiedVoteDetail | null> {
  const congressNum = parseInt(congress, 10);
  const rollNumber = parseInt(voteId, 10);
  if (!Number.isFinite(congressNum) || !Number.isFinite(rollNumber)) return null;

  try {
    const redis = getRedisCache();

    let compact: CompactRollCall | null = null;
    let session = 0;
    for (const s of sessionsToTry(congress, knownSession)) {
      compact = await redis.get<CompactRollCall>(rollKey('senate', congressNum, s, rollNumber));
      if (compact) {
        session = s;
        break;
      }
    }
    if (!compact) return null;

    const menu = await getSenateVoteMenu(congressNum);
    const entry = menu?.sessions[String(session)]?.find(e => e.n === rollNumber);

    const roll = expandRoll(compact, congressNum, 'Senate');
    const infoMap = await getLegislatorInfoMap();

    const members: SenatorVote[] = roll.memberVotes.map(mv => {
      const info = infoMap.get(mv.bioguideId);
      return {
        id: mv.bioguideId,
        lisId: '',
        bioguideId: mv.bioguideId,
        firstName: info?.firstName ?? '',
        lastName: info?.lastName ?? '',
        fullName: info?.fullName ?? mv.bioguideId,
        state: info?.state ?? '',
        party: mv.party === 'D' || mv.party === 'R' ? mv.party : 'I',
        position: mv.position,
      };
    });
    members.sort((a, b) =>
      a.state !== b.state ? a.state.localeCompare(b.state) : a.lastName.localeCompare(b.lastName)
    );

    // Menu titles for measures read "Motion to …; <measure title>".
    const title = entry?.t || entry?.q || 'Senate Vote';
    const semi = title.indexOf('; ');
    const billTitle = semi > -1 ? title.slice(semi + 2).trim() : title;
    const billType = entry?.i
      .match(/^[A-Za-z.\s]+/)?.[0]
      ?.replace(/[^A-Za-z]/g, '')
      .toUpperCase();

    const paddedVoteId = String(rollNumber).padStart(5, '0');
    const xmlUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedVoteId}.xml`;

    return {
      voteId: paddedVoteId,
      congress,
      session: String(session),
      rollNumber,
      date: compact.date,
      title,
      question: entry?.q || '',
      description: entry?.q || title,
      result: entry?.r || '',
      chamber: 'Senate',
      yeas: roll.totals.yea,
      nays: roll.totals.nay,
      present: roll.totals.present,
      absent: roll.totals.notVoting,
      totalVotes: members.length,
      members,
      bill:
        entry?.i && billType ? { number: entry.i, title: billTitle, type: billType } : undefined,
      metadata: {
        source: 'senate-corpus-mirror',
        confidence: 'high',
        processingDate: new Date().toISOString(),
        xmlUrl,
      },
    };
  } catch (error) {
    logger.error('Error building Senate vote from corpus', error as Error, { voteId, congress });
    return null;
  }
}

// Parse Senate vote from XML, with the mirrored corpus as fallback
async function parseSenateVote(
  voteId: string,
  congress: string,
  knownSession?: string
): Promise<UnifiedVoteDetail | null> {
  try {
    const paddedVoteId = voteId.padStart(5, '0');

    // Roll-call numbers restart each session; try the likeliest session
    // first. Skipped entirely on Vercel, where senate.gov is Akamai-blocked
    // (MR10) — the corpus fallback below serves those environments.
    let xmlUrl = '';
    let xmlText: string | null = null;
    if (!isSenateXmlDisabled()) {
      for (const session of sessionsToTry(congress, knownSession)) {
        xmlUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedVoteId}.xml`;
        const response = await fetch(xmlUrl, {
          headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) continue;
        const body = await response.text();
        // senate.gov can serve a 200 HTML error page for missing votes
        if (body.includes('<roll_call_vote')) {
          xmlText = body;
          break;
        }
      }
    }

    if (!xmlText) return senateVoteFromCorpus(voteId, congress, knownSession);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
    });

    const xmlData = parser.parse(xmlText);
    const rcv = xmlData.roll_call_vote;
    if (!rcv) return null;

    const countData = rcv.count || {};
    const yeas = parseInt(String(countData.yeas || '0'));
    const nays = parseInt(String(countData.nays || '0'));
    const present = parseInt(String(countData.present || '0'));
    const absent = parseInt(String(countData.absent || '0'));

    const members: SenatorVote[] = [];
    if (rcv.members?.member) {
      const memberList = Array.isArray(rcv.members.member)
        ? rcv.members.member
        : [rcv.members.member];
      const senatorLookup = await getSenatorBioguideLookup();
      for (const m of memberList) {
        const lisId = String(m.lis_member_id || '');
        const firstName = String(m.first_name || '');
        const lastName = String(m.last_name || '');
        const state = String(m.state || '');
        const bioguideId =
          senatorLookup.byLis.get(lisId) ??
          senatorLookup.byNameState.get(`${lastName.toLowerCase()}_${state.toLowerCase()}`);

        const partyRaw = String(m.party || '');
        members.push({
          id: bioguideId || lisId,
          lisId,
          bioguideId,
          firstName,
          lastName,
          fullName: String(m.member_full || ''),
          state,
          party: partyRaw === 'D' || partyRaw === 'R' ? partyRaw : 'I',
          position: normalizeVotePosition(String(m.vote_cast || '')),
        });
      }
    }

    members.sort((a, b) =>
      a.state !== b.state ? a.state.localeCompare(b.state) : a.lastName.localeCompare(b.lastName)
    );

    return {
      voteId: paddedVoteId,
      congress: String(rcv.congress || '119'),
      session: String(rcv.session || '1'),
      rollNumber: parseInt(String(rcv.vote_number || voteId)),
      date: String(rcv.vote_date || ''),
      time: String(rcv.vote_time || ''),
      title: String(rcv.vote_title || rcv.question || 'Senate Vote'),
      question: String(rcv.question || rcv.vote_title || ''),
      description: String(rcv.vote_description || rcv.question || ''),
      documentText: rcv.vote_document_text ? String(rcv.vote_document_text) : undefined,
      result: String(rcv.vote_result || 'Unknown'),
      chamber: 'Senate',
      yeas,
      nays,
      present,
      absent,
      totalVotes: yeas + nays + present + absent,
      requiredMajority: String(rcv.majority_requirement || ''),
      members,
      bill: rcv.document?.document_name
        ? {
            number: String(rcv.document.document_name),
            title: String(rcv.document.document_title || ''),
            type: String(rcv.document.document_type || 'Bill'),
          }
        : undefined,
      amendment: rcv.amendment
        ? {
            number: String(rcv.amendment.amendment_number || ''),
            purpose: String(rcv.amendment.amendment_purpose || ''),
          }
        : undefined,
      metadata: {
        source: 'senate-xml-feed',
        confidence: 'high',
        processingDate: new Date().toISOString(),
        xmlUrl,
      },
    };
  } catch (error) {
    logger.error('Error parsing Senate vote', error as Error, { voteId });
    return null;
  }
}

/**
 * Enrich a vote's bill data with title and CRS summary from Congress.gov API.
 * Non-fatal — returns the vote unchanged if enrichment fails.
 */
async function enrichBillData(vote: UnifiedVoteDetail): Promise<UnifiedVoteDetail> {
  if (!vote.bill?.number) return vote;

  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) return vote;

    // Parse bill type and number from the document name (e.g., "H.R. 1234" or "S. 567")
    const match = vote.bill.number.match(
      /^(H\.?\s*R\.?|S\.?|H\.?\s*Con\.?\s*Res\.?|S\.?\s*Con\.?\s*Res\.?|H\.?\s*J\.?\s*Res\.?|S\.?\s*J\.?\s*Res\.?|H\.?\s*Res\.?|S\.?\s*Res\.?)\s*(\d+)$/i
    );
    if (!match) return vote;

    const typeSlug = match[1]!.replace(/[\s.]/g, '').toLowerCase();
    const billNumber = match[2]!;
    const apiUrl = `https://api.congress.gov/v3/bill/${vote.congress}/${typeSlug}/${billNumber}?format=json`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/2.0 (civic-engagement-tool)',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return vote;

    const data = await response.json();
    const title = data.bill?.title || vote.bill.title;
    const url = data.bill?.url || undefined;

    let summary: string | undefined;
    if (data.bill?.summaries && Array.isArray(data.bill.summaries)) {
      const latest = data.bill.summaries[0];
      if (latest?.text) {
        summary = latest.text.replace(/<[^>]*>/g, '').trim();
      }
    }

    return {
      ...vote,
      bill: {
        ...vote.bill,
        title: title || vote.bill.title,
        url,
        summary,
      },
    };
  } catch {
    return vote;
  }
}

/**
 * Get vote details - main entry point
 * Used by both API routes and server components
 */
export async function getVoteDetailsService(voteId: string): Promise<UnifiedVoteDetail | null> {
  const parsed = parseVoteId(voteId);

  let vote: UnifiedVoteDetail | null;
  if (parsed.chamber === 'House') {
    vote = await parseHouseVote(voteId, parsed.congress, parsed.rollNumber, parsed.session);
  } else {
    vote = await parseSenateVote(parsed.numericId, parsed.congress, parsed.session);
  }

  if (!vote) return null;

  // Enrich with bill title + CRS summary from Congress.gov
  return enrichBillData(vote);
}

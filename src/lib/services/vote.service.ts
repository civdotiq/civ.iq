/**
 * Vote Service - Shared data fetching for vote details
 * Used by both API routes and server components
 *
 * This is a thin wrapper that imports the parsing logic from the API route
 * to avoid duplicating ~1000 lines of XML parsing code.
 */

import { XMLParser } from 'fast-xml-parser';
import logger from '@/lib/logging/simple-logger';
import { getLegislatorInfoMap } from '@/lib/data/legislator-mappings';

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

// LIS ID to Bioguide mapping for current senators
function mapLISIdToBioguideId(
  lisId: string,
  firstName: string,
  lastName: string,
  state: string
): string | undefined {
  const lisMapping: Record<string, string> = {
    S330: 'B001230',
    S317: 'B001267',
    S306: 'B000944',
    S348: 'B001135',
    S361: 'B001236',
    S341: 'B001243',
    S355: 'B001277',
    S318: 'C000127',
    S309: 'C001047',
    S350: 'C001070',
    S252: 'C001035',
    S323: 'C001056',
    S362: 'C001113',
    S366: 'C001096',
    S324: 'C001098',
    S293: 'D000563',
    S322: 'F000062',
    S353: 'F000463',
    S320: 'G000386',
    S316: 'G000359',
    S351: 'H001046',
    S356: 'H001061',
    S339: 'H001079',
    S331: 'H001042',
    S325: 'J000300',
    S321: 'K000384',
    S349: 'K000367',
    S290: 'L000174',
    S326: 'M000355',
    S357: 'M001183',
    S347: 'M001169',
    S340: 'M001153',
    S308: 'P000603',
    S352: 'P000449',
    S319: 'R000122',
    S327: 'R000584',
    S328: 'S000033',
    S329: 'S001194',
    S314: 'S000148',
    S344: 'S001181',
    S345: 'S001203',
    S346: 'S001217',
    S315: 'T000464',
    S354: 'T000476',
    S337: 'W000817',
    S358: 'W000802',
    S359: 'W000779',
    S360: 'Y000064',
  };

  if (lisMapping[lisId]) return lisMapping[lisId];

  const nameStateKey = `${lastName.toLowerCase()}_${state}`;
  const nameBasedMapping: Record<string, string> = {
    baldwin_wi: 'B001230',
    bennet_co: 'B001267',
    brown_oh: 'B000944',
    collins_me: 'C001035',
    cantwell_wa: 'C000127',
    klobuchar_mn: 'K000367',
    sanders_vt: 'S000033',
    warren_ma: 'W000817',
  };

  return nameBasedMapping[nameStateKey];
}

// Parse vote ID to determine chamber
function parseVoteId(voteId: string): {
  chamber: 'House' | 'Senate';
  congress: string;
  rollNumber: string;
  numericId: string;
} {
  const houseMatch = voteId.match(/^house-(\d+)-(\d+)$/);
  if (houseMatch && houseMatch[1] && houseMatch[2]) {
    return {
      chamber: 'House',
      congress: houseMatch[1],
      rollNumber: houseMatch[2],
      numericId: houseMatch[2],
    };
  }

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
    const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${typeSlug}/${billNumber}?api_key=${process.env.CONGRESS_API_KEY || ''}`;
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
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
      /<recorded-vote><legislator name-id="([^"]+)"[^>]*>([^<]*)<\/legislator><vote>([^<]+)<\/vote><\/recorded-vote>/gi;
    const members: MemberVote[] = [];
    let match;

    while ((match = memberPattern.exec(xmlText)) !== null) {
      const [, bioguideId, memberInfo, votePosition] = match;
      if (!bioguideId || !votePosition) continue;

      const nameMatch = memberInfo?.match(/([^,]+)/);
      const fullName = nameMatch?.[1]?.trim() || 'Unknown';
      const nameParts = fullName.split(' ');

      let position: MemberVote['position'];
      switch (votePosition.trim()) {
        case 'Yea':
          position = 'Yea';
          break;
        case 'Nay':
          position = 'Nay';
          break;
        case 'Present':
          position = 'Present';
          break;
        default:
          position = 'Not Voting';
      }

      members.push({
        id: bioguideId,
        bioguideId,
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || 'Unknown',
        fullName,
        state: 'Unknown',
        party: 'R',
        position,
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
  rollNumber: string
): Promise<UnifiedVoteDetail | null> {
  try {
    const sessionsToTry = [1, 2];
    let response: Response | null = null;
    let sessionNumber = 1;
    let apiUrl = '';

    for (const session of sessionsToTry) {
      apiUrl = `https://api.congress.gov/v3/house-vote/${congress}/${session}/${rollNumber}?api_key=${process.env.CONGRESS_API_KEY || ''}`;
      response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
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

// Parse Senate vote from XML
async function parseSenateVote(voteId: string): Promise<UnifiedVoteDetail | null> {
  try {
    const paddedVoteId = voteId.padStart(5, '0');
    const xmlUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_${paddedVoteId}.xml`;

    const response = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const xmlText = await response.text();
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
      for (const m of memberList) {
        const lisId = String(m.lis_member_id || '');
        const firstName = String(m.first_name || '');
        const lastName = String(m.last_name || '');
        const state = String(m.state || '');
        const bioguideId = mapLISIdToBioguideId(lisId, firstName, lastName, state);

        members.push({
          id: bioguideId || lisId,
          lisId,
          bioguideId,
          firstName,
          lastName,
          fullName: String(m.member_full || ''),
          state,
          party: String(m.party || '') as 'D' | 'R' | 'I',
          position: String(m.vote_cast || 'Not Voting') as MemberVote['position'],
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
 * Get vote details - main entry point
 * Used by both API routes and server components
 */
export async function getVoteDetailsService(voteId: string): Promise<UnifiedVoteDetail | null> {
  const parsed = parseVoteId(voteId);

  if (parsed.chamber === 'House') {
    return parseHouseVote(voteId, parsed.congress, parsed.rollNumber);
  }
  return parseSenateVote(parsed.numericId);
}

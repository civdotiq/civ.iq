// Roll call XML parser for Senate and House voting data
import { XMLParser } from 'fast-xml-parser';

export interface RollCallVote {
  memberId: string;
  memberName: string;
  party: string;
  state: string;
  district?: string;
  vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

export interface RollCallData {
  congress: number;
  session: number;
  chamber: 'House' | 'Senate';
  rollNumber: number;
  date: string;
  bill?: {
    number: string;
    title?: string;
  };
  question: string;
  result: string;
  votes: RollCallVote[];
  totals: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
}

export class RollCallParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      removeNSPrefix: true
    });
  }

  async fetchAndParseRollCall(url: string): Promise<RollCallData | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch roll call from ${url}: ${response.status}`);
        return null;
      }

      const xmlText = await response.text();
      const parsed = this.parser.parse(xmlText);

      if (url.includes('senate.gov')) {
        return this.parseSenateRollCall(parsed, url);
      } else if (url.includes('clerk.house.gov')) {
        return this.parseHouseRollCall(parsed, url);
      }

      return null;
    } catch (error) {
      console.error(`Error parsing roll call from ${url}:`, error);
      return null;
    }
  }

  private parseSenateRollCall(parsed: any, url: string): RollCallData | null {
    try {
      const vote = parsed.roll_call_vote;
      if (!vote) return null;

      // Extract metadata
      const congress = parseInt(vote.congress) || 0;
      const session = parseInt(vote.session) || 0;
      const rollNumber = parseInt(vote.vote_number) || 0;
      
      const votes: RollCallVote[] = [];
      const members = vote.members?.member;
      
      if (members) {
        const memberArray = Array.isArray(members) ? members : [members];
        
        for (const member of memberArray) {
          // Extract party and state from member_full format like "Baldwin (D-WI)"
          const fullName = member.member_full || '';
          const partyStateMatch = fullName.match(/\(([DR])-([A-Z]{2})\)$/);
          
          votes.push({
            memberId: member.lis_member_id || '',
            memberName: member.last_name || '',
            party: partyStateMatch ? partyStateMatch[1] : '',
            state: partyStateMatch ? partyStateMatch[2] : '',
            vote: this.normalizeVote(member.vote_cast)
          });
        }
      }

      // Calculate totals
      const totals = this.calculateTotals(votes);

      return {
        congress,
        session,
        chamber: 'Senate',
        rollNumber,
        date: vote.vote_date || '',
        bill: vote.document ? {
          number: vote.document.document_name || '',
          title: vote.document.document_title || ''
        } : undefined,
        question: vote.question || 'On the Motion',
        result: vote.vote_result || '',
        votes,
        totals
      };
    } catch (error) {
      console.error('Error parsing Senate roll call:', error);
      return null;
    }
  }

  private parseHouseRollCall(parsed: any, url: string): RollCallData | null {
    try {
      const rollCall = parsed['rollcall-vote'];
      if (!rollCall) return null;

      const metadata = rollCall['vote-metadata'];
      const voteData = rollCall['vote-data'];

      const congress = parseInt(metadata?.congress) || 0;
      const session = parseInt(metadata?.session) || 0;
      const rollNumber = parseInt(metadata?.rollcall_num) || 0;

      const votes: RollCallVote[] = [];
      const recordedVotes = voteData?.['recorded-vote'];
      
      if (recordedVotes) {
        const voteArray = Array.isArray(recordedVotes) ? recordedVotes : [recordedVotes];
        
        for (const vote of voteArray) {
          const legislator = vote.legislator;
          if (legislator) {
            votes.push({
              memberId: legislator['@_name-id'] || '',
              memberName: legislator['@_unaccented-name'] || '',
              party: legislator['@_party'] || '',
              state: legislator['@_state'] || '',
              vote: this.normalizeVote(vote.vote)
            });
          }
        }
      }

      const totals = this.calculateTotals(votes);

      return {
        congress,
        session,
        chamber: 'House',
        rollNumber,
        date: metadata?.['action-date'] || '',
        bill: metadata?.legis_num ? {
          number: metadata.legis_num,
          title: metadata.vote_desc
        } : undefined,
        question: metadata?.vote_question || 'On Passage',
        result: metadata?.vote_result || '',
        votes,
        totals
      };
    } catch (error) {
      console.error('Error parsing House roll call:', error);
      return null;
    }
  }

  private normalizeVote(vote: string): 'Yea' | 'Nay' | 'Present' | 'Not Voting' {
    if (!vote) return 'Not Voting';
    
    const normalized = vote.toLowerCase().trim();
    
    if (normalized === 'yea' || normalized === 'aye' || normalized === 'yes') {
      return 'Yea';
    } else if (normalized === 'nay' || normalized === 'no') {
      return 'Nay';
    } else if (normalized === 'present') {
      return 'Present';
    } else {
      return 'Not Voting';
    }
  }

  private calculateTotals(votes: RollCallVote[]) {
    return votes.reduce(
      (totals, vote) => {
        switch (vote.vote) {
          case 'Yea':
            totals.yea++;
            break;
          case 'Nay':
            totals.nay++;
            break;
          case 'Present':
            totals.present++;
            break;
          case 'Not Voting':
            totals.notVoting++;
            break;
        }
        return totals;
      },
      { yea: 0, nay: 0, present: 0, notVoting: 0 }
    );
  }

  // Helper method to find a specific member's vote in roll call data
  findMemberVote(rollCallData: RollCallData, bioguideId: string, memberName: string): RollCallVote | null {
    // Try to match by bioguide ID first (if we have a mapping)
    // For now, try name-based matching
    const nameParts = memberName.toLowerCase().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    
    return rollCallData.votes.find(vote => 
      vote.memberName.toLowerCase().includes(lastName) ||
      vote.memberId === bioguideId
    ) || null;
  }
}
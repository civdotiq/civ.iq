/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Agriculture Committee (HSAG) - 119th Congress
// Based on official committee roster from agriculture.house.gov

const createRepresentative = (
  bioguideId: string,
  name: string,
  party: 'R' | 'D',
  state: string,
  district?: string
): EnhancedRepresentative => ({
  bioguideId,
  name,
  firstName: name.split(' ')[0],
  lastName: name.split(' ').slice(-1)[0],
  party,
  state,
  district,
  chamber: 'House',
  directOrderName: name,
  invertedOrderName: `${name.split(' ').slice(-1)[0]}, ${name.split(' ')[0]}`,
  termStart: '2025-01-03',
  termEnd: '2027-01-03',
  votingRecord: {
    totalVotes: 0,
    votesWithParty: 0,
    votesAgainstParty: 0,
    partyUnityScore: 0,
    abstentions: 0,
    lastUpdated: new Date().toISOString(),
  },
  billsSponsored: 0,
  billsCosponsored: 0,
  lastUpdated: new Date().toISOString(),
  committees: [],
  subcommittees: [],
  caucuses: [],
  socialMedia: {},
  officeLocations: [],
  currentCommittees: ['House Committee on Agriculture'],
  currentSubcommittees: [],
  currentCaucuses: [],
  endorsements: [],
});

// Committee leadership
const chairman = createRepresentative('T000467', 'Glenn "GT" Thompson', 'R', 'PA', '15');
const rankingMember = createRepresentative('C001119', 'Angie Craig', 'D', 'MN', '02');

// Republican members (in order of seniority/rank)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('L000491', 'Frank Lucas', 'R', 'OK', '03'),
  createRepresentative('S001189', 'Austin Scott', 'R', 'GA', '08'),
  createRepresentative('C001087', 'Rick Crawford', 'R', 'AR', '01'),
  createRepresentative('D000616', 'Scott DesJarlais', 'R', 'TN', '04'),
  createRepresentative('L000578', 'Doug LaMalfa', 'R', 'CA', '01'),
  createRepresentative('B001298', 'Don Bacon', 'R', 'NE', '02'),
  createRepresentative('K000388', 'Trent Kelly', 'R', 'MS', '01'),
  createRepresentative('N000189', 'Dan Newhouse', 'R', 'WA', '04'),
  createRepresentative('B001307', 'Jim Baird', 'R', 'IN', '04'),
  createRepresentative('J000301', 'Dusty Johnson', 'R', 'SD', 'AL'),
  createRepresentative('M001211', 'Mary Miller', 'R', 'IL', '15'),
  createRepresentative('B001295', 'Mike Bost', 'R', 'IL', '12'),
  createRepresentative('J000302', 'John James', 'R', 'MI', '10'),
  createRepresentative('C001118', 'Michael Cloud', 'R', 'TX', '27'),
  createRepresentative('C001133', 'Lori Chavez-DeRemer', 'R', 'OR', '05'),
  createRepresentative('D000630', 'Monica De La Cruz', 'R', 'TX', '15'),
  createRepresentative('R000612', 'John Rose', 'R', 'TN', '06'),
  createRepresentative('C001111', 'Kat Cammack', 'R', 'FL', '03'),
  createRepresentative('M001218', 'Max Miller', 'R', 'OH', '07'),
  createRepresentative('V000134', 'Derrick Van Orden', 'R', 'WI', '03'),
  createRepresentative('Y000067', 'Rudy Yakym', 'R', 'IN', '02'),
  createRepresentative('K000396', 'Tom Kean Jr.', 'R', 'NJ', '07'),
  createRepresentative('Z000018', 'Ryan Zinke', 'R', 'MT', '01'),
  createRepresentative('N000193', 'Zach Nunn', 'R', 'IA', '03'),
  createRepresentative('W000828', 'Tony Wied', 'R', 'WI', '08'),
];

// Democratic members (in order of seniority/rank)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  createRepresentative('B001317', 'Shontel Brown', 'D', 'OH', '11'),
  createRepresentative('D000629', 'Sharice Davids', 'D', 'KS', '03'),
  createRepresentative('M000312', 'Jim McGovern', 'D', 'MA', '02'),
  createRepresentative('C001059', 'Jim Costa', 'D', 'CA', '21'),
  createRepresentative('A000370', 'Alma Adams', 'D', 'NC', '12'),
  createRepresentative('K000385', 'Robin Kelly', 'D', 'IL', '02'),
  createRepresentative('K000382', 'Ann McLane Kuster', 'D', 'NH', '02'),
  createRepresentative('P000597', 'Chellie Pingree', 'D', 'ME', '01'),
  createRepresentative('C001067', 'Yvette Clarke', 'D', 'NY', '09'),
  createRepresentative('P000613', 'Jimmy Panetta', 'D', 'CA', '19'),
  createRepresentative('C001112', 'Salud Carbajal', 'D', 'CA', '24'),
  createRepresentative('O000173', 'Tom O\'Halleran', 'D', 'AZ', '01'),
  createRepresentative('K000389', 'Ro Khanna', 'D', 'CA', '17'),
  createRepresentative('S001216', 'Kim Schrier', 'D', 'WA', '08'),
  createRepresentative('S001225', 'Eric Sorensen', 'D', 'IL', '17'),
  createRepresentative('R000622', 'Josh Riley', 'D', 'NY', '19'),
  createRepresentative('B001340', 'Nikki Budzinski', 'D', 'IL', '13'),
  createRepresentative('D000637', 'Donald Davis', 'D', 'NC', '01'),
  createRepresentative('V000081', 'Nydia Velázquez', 'D', 'NY', '07'),
  createRepresentative('M001230', 'Kristen McDonald Rivet', 'D', 'MI', '08'),
  createRepresentative('V000135', 'Eugene Vindman', 'D', 'VA', '07'),
  createRepresentative('C001132', 'Herb Conaway', 'D', 'NJ', '03'),
  createRepresentative('M001229', 'April McClain Delaney', 'D', 'MD', '06'),
];

// Convert to CommitteeMembers
const createCommitteeMember = (
  rep: EnhancedRepresentative,
  role: string,
  rank: number,
  joinedDate: string = '2025-01-03'
): CommitteeMember => ({
  representative: rep,
  role,
  joinedDate,
  rank,
  subcommittees: [],
});

// Create the committee object
export const houseAgricultureCommittee: Committee = {
  id: 'HSAG',
  thomas_id: 'HSAG',
  name: 'House Committee on Agriculture',
  chamber: 'House',
  type: 'Standing',
  jurisdiction: 'The House Committee on Agriculture has jurisdiction over federal agriculture policy and oversight of some federal agencies, and it can recommend funding appropriations for various governmental agencies. The Committee has jurisdiction over: ' +
    'adulteration of seeds, insect pests, and protection of birds and animals in forest reserves; ' +
    'agriculture generally; agricultural and industrial chemistry; agricultural colleges and experiment stations; ' +
    'agricultural economics and research; agricultural education extension services; ' +
    'agricultural production and marketing and stabilization of prices of agricultural products, and commodities (not including distribution outside of the United States); ' +
    'animal industry and diseases of animals; commodity exchanges; crop insurance and soil conservation; ' +
    'dairy industry; entomology and plant quarantine; extension of farm credit and farm security; ' +
    'forestry in general, and forest reserves other than those created from the public domain; ' +
    'human nutrition and home economics; inspection of livestock, poultry, meat products, and seafood and seafood products; ' +
    'plant industry, soils, and agricultural engineering; rural electrification; ' +
    'rural development; water conservation related to activities of the Department of Agriculture.',
  
  leadership: {
    chair: createCommitteeMember(chairman, 'Chair', 1),
    rankingMember: createCommitteeMember(rankingMember, 'Ranking Member', 2),
  },

  members: [
    // Leadership
    createCommitteeMember(chairman, 'Chair', 1),
    createCommitteeMember(rankingMember, 'Ranking Member', 2),
    
    // Republican members (excluding chair)
    ...republicanMembers.slice(1).map((rep, index) => 
      createCommitteeMember(rep, 'Member', index + 3)
    ),
    
    // Democratic members (excluding ranking member)
    ...democraticMembers.slice(1).map((rep, index) => 
      createCommitteeMember(rep, 'Member', republicanMembers.length + index + 2)
    ),
  ],

  subcommittees: [
    {
      id: 'HSAG15',
      name: 'Conservation, Research, and Biotechnology',
      chair: republicanMembers.find(m => m.name === 'Doug LaMalfa'),
      rankingMember: democraticMembers.find(m => m.name === 'Ro Khanna'),
      focus: 'Conservation on farms and ranches, agricultural credit, crop insurance, agricultural research and biotechnology, and general forestry issues.',
      members: [
        createCommitteeMember(republicanMembers.find(m => m.name === 'Doug LaMalfa')!, 'Chair', 1),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Ro Khanna')!, 'Ranking Member', 2),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Jim Baird')!, 'Member', 3),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Dan Newhouse')!, 'Member', 4),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Trent Kelly')!, 'Member', 5),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Chellie Pingree')!, 'Member', 6),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Salud Carbajal')!, 'Member', 7),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Kim Schrier')!, 'Member', 8),
      ],
    },
    {
      id: 'HSAG14',
      name: 'General Farm Commodities and Risk Management',
      chair: republicanMembers.find(m => m.name === 'Austin Scott'),
      rankingMember: democraticMembers.find(m => m.name === 'Sharice Davids'),
      focus: 'Farm commodities, marketing, crop insurance and risk management, and agricultural credit.',
      members: [
        createCommitteeMember(republicanMembers.find(m => m.name === 'Austin Scott')!, 'Chair', 1),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Sharice Davids')!, 'Ranking Member', 2),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Rick Crawford')!, 'Member', 3),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Dusty Johnson')!, 'Member', 4),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Mary Miller')!, 'Member', 5),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Eric Sorensen')!, 'Member', 6),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Tom O\'Halleran')!, 'Member', 7),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Nikki Budzinski')!, 'Member', 8),
      ],
    },
    {
      id: 'HSAG03',
      name: 'Nutrition, Foreign Agriculture, and Horticulture',
      chair: republicanMembers.find(m => m.name === 'Mike Bost'),
      rankingMember: democraticMembers.find(m => m.name === 'Jim McGovern'),
      focus: 'Domestic and international food assistance and nutrition programs, foreign agricultural trade and assistance, and horticulture.',
      members: [
        createCommitteeMember(republicanMembers.find(m => m.name === 'Mike Bost')!, 'Chair', 1),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Jim McGovern')!, 'Ranking Member', 2),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Scott DesJarlais')!, 'Member', 3),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Kat Cammack')!, 'Member', 4),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Max Miller')!, 'Member', 5),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Alma Adams')!, 'Member', 6),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Jimmy Panetta')!, 'Member', 7),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Ann McLane Kuster')!, 'Member', 8),
      ],
    },
    {
      id: 'HSAG22',
      name: 'Commodity Exchanges, Energy, and Credit',
      chair: republicanMembers.find(m => m.name === 'Frank Lucas'),
      rankingMember: democraticMembers.find(m => m.name === 'Robin Kelly'),
      focus: 'Futures markets, renewable energy production on farmland, and rural development.',
      members: [
        createCommitteeMember(republicanMembers.find(m => m.name === 'Frank Lucas')!, 'Chair', 1),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Robin Kelly')!, 'Ranking Member', 2),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Don Bacon')!, 'Member', 3),
        createCommitteeMember(republicanMembers.find(m => m.name === 'John James')!, 'Member', 4),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Michael Cloud')!, 'Member', 5),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Shontel Brown')!, 'Member', 6),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Yvette Clarke')!, 'Member', 7),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Nydia Velázquez')!, 'Member', 8),
      ],
    },
    {
      id: 'HSAG29',
      name: 'Livestock, Dairy, and Poultry',
      chair: republicanMembers.find(m => m.name === 'Rick Crawford'),
      rankingMember: democraticMembers.find(m => m.name === 'Jim Costa'),
      focus: 'All aspects of livestock, dairy, poultry, meat science and research, aquaculture, and seafood.',
      members: [
        createCommitteeMember(republicanMembers.find(m => m.name === 'Rick Crawford')!, 'Chair', 1),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Jim Costa')!, 'Ranking Member', 2),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Trent Kelly')!, 'Member', 3),
        createCommitteeMember(republicanMembers.find(m => m.name === 'John Rose')!, 'Member', 4),
        createCommitteeMember(republicanMembers.find(m => m.name === 'Monica De La Cruz')!, 'Member', 5),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Donald Davis')!, 'Member', 6),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Josh Riley')!, 'Member', 7),
        createCommitteeMember(democraticMembers.find(m => m.name === 'Kristen McDonald Rivet')!, 'Member', 8),
      ],
    },
  ],

  url: 'https://agriculture.house.gov',
  phone: '(202) 225-2171',
  address: '1301 Longworth House Office Building, Washington, DC 20515',
  established: '1820-05-03',
  lastUpdated: new Date().toISOString(),
};

// Export a function to get committee by ID
export const getCommitteeData = (committeeId: string): Committee | null => {
  if (committeeId.toUpperCase() === 'HSAG') {
    return houseAgricultureCommittee;
  }
  return null;
};

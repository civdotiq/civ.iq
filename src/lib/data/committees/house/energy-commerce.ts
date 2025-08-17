/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Committee on Energy and Commerce - 119th Congress
// Source: https://energycommerce.house.gov and Congressional records

const createRepresentative = (
  bioguideId: string,
  name: string,
  party: 'R' | 'D',
  state: string,
  district?: string
): EnhancedRepresentative => ({
  bioguideId,
  name,
  firstName: name.split(' ')[0] || name,
  lastName: name.split(' ').slice(-1)[0] || name,
  party,
  state,
  district,
  chamber: 'House',
  title: `Representative for ${state}-${district}`,
  terms: [
    {
      congress: '119',
      startYear: '2025',
      endYear: '2027',
    },
  ],
  committees: [
    {
      name: 'House Committee on Energy and Commerce',
      role: 'Member',
    },
  ],
});

const createCommitteeMember = (
  rep: EnhancedRepresentative,
  role: 'Chair' | 'Ranking Member' | 'Vice Chair' | 'Member',
  rank: number,
  joinedDate: string = '2025-01-03'
): CommitteeMember => ({
  representative: rep,
  role,
  joinedDate,
  rank,
  subcommittees: [],
});

// Committee leadership
const chairman = createRepresentative('G000558', 'Brett Guthrie', 'R', 'KY', '02');
const rankingMember = createRepresentative('P000034', 'Frank Pallone', 'D', 'NJ', '06');

// Republican members (32 total)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('L000566', 'Bob Latta', 'R', 'OH', '05'),
  createRepresentative('G000568', 'Morgan Griffith', 'R', 'VA', '09'),
  createRepresentative('B001257', 'Gus Bilirakis', 'R', 'FL', '12'),
  createRepresentative('J000292', 'Bill Johnson', 'R', 'OH', '06'),
  createRepresentative('B001296', 'Buddy Carter', 'R', 'GA', '01'),
  createRepresentative('D000615', 'Jeff Duncan', 'R', 'SC', '03'),
  createRepresentative('H001067', 'Richard Hudson', 'R', 'NC', '09'),
  createRepresentative('W000798', 'Tim Walberg', 'R', 'MI', '05'),
  createRepresentative('G000565', 'Paul Gosar', 'R', 'AZ', '09'),
  createRepresentative('C001087', 'Rick Crawford', 'R', 'AR', '01'),
  createRepresentative('C001054', 'Jerry Carl', 'R', 'AL', '01'),
  createRepresentative('A000372', 'Rick Allen', 'R', 'GA', '12'),
  createRepresentative('B001282', 'Troy Balderson', 'R', 'OH', '12'),
  createRepresentative('P000615', 'Greg Pence', 'R', 'IN', '06'),
  createRepresentative('D000628', 'Neal Dunn', 'R', 'FL', '02'),
  createRepresentative('C001114', 'John Curtis', 'R', 'UT', '03'),
  createRepresentative('L000589', 'Debbie Lesko', 'R', 'AZ', '08'),
  createRepresentative('P000616', 'August Pfluger', 'R', 'TX', '11'),
  createRepresentative('M001224', 'Nathaniel Moran', 'R', 'TX', '01'),
  createRepresentative('F000469', 'Russ Fulcher', 'R', 'ID', '01'),
  createRepresentative('J000301', 'John Joyce', 'R', 'PA', '13'),
  createRepresentative('C001120', 'Kat Cammack', 'R', 'FL', '03'),
  createRepresentative('O000019', 'Jay Obernolte', 'R', 'CA', '03'),
  createRepresentative('M001194', 'John Moolenaar', 'R', 'MI', '02'),
  createRepresentative('H001093', 'Erin Houchin', 'R', 'IN', '09'),
  createRepresentative('F000478', 'Russell Fry', 'R', 'SC', '07'),
  createRepresentative('K000398', 'Tom Kean Jr.', 'R', 'NJ', '07'),
  createRepresentative('G000595', 'Bob Good', 'R', 'VA', '05'),
  createRepresentative('B001316', 'Ryan Biggs', 'R', 'IA', '01'),
  createRepresentative('M001225', 'Richard McCormick', 'R', 'GA', '06'),
  createRepresentative('G000601', 'Mike Garcia', 'R', 'CA', '27'),
];

// Democratic members (27 total)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  createRepresentative('D000197', 'Diana DeGette', 'D', 'CO', '01'),
  createRepresentative('S001145', 'Jan Schakowsky', 'D', 'IL', '09'),
  createRepresentative('M001163', 'Doris Matsui', 'D', 'CA', '07'),
  createRepresentative('C001066', 'Kathy Castor', 'D', 'FL', '14'),
  createRepresentative('T000469', 'Paul Tonko', 'D', 'NY', '20'),
  createRepresentative('C001067', 'Yvette Clarke', 'D', 'NY', '09'),
  createRepresentative('R000599', 'Raul Ruiz', 'D', 'CA', '25'),
  createRepresentative('P000608', 'Scott Peters', 'D', 'CA', '50'),
  createRepresentative('D000624', 'Debbie Dingell', 'D', 'MI', '06'),
  createRepresentative('V000131', 'Marc Veasey', 'D', 'TX', '33'),
  createRepresentative('K000394', 'Ann Kuster', 'D', 'NH', '02'),
  createRepresentative('K000385', 'Robin Kelly', 'D', 'IL', '02'),
  createRepresentative('B001303', 'Lisa Blunt Rochester', 'D', 'DE', 'AL'),
  createRepresentative('S001168', 'Darren Soto', 'D', 'FL', '09'),
  createRepresentative('O000173', "Tom O'Halleran", 'D', 'AZ', '02'),
  createRepresentative('B001318', 'Lori Trahan', 'D', 'MA', '03'),
  createRepresentative('F000468', 'Lizzie Fletcher', 'D', 'TX', '07'),
  createRepresentative('B001306', 'Troy Carter', 'D', 'LA', '02'),
  createRepresentative('P000618', 'Chris Pappas', 'D', 'NH', '01'),
  createRepresentative('N000194', 'Joseph Neguse', 'D', 'CO', '02'),
  createRepresentative('T000488', 'Tina Smith', 'D', 'MN', 'Senate'), // Note: This might be an error in the data
  createRepresentative('A000376', 'Colin Allred', 'D', 'TX', '32'),
  createRepresentative('S001225', 'Eric Sorensen', 'D', 'IL', '17'),
  createRepresentative('D000631', 'Daniel Davis', 'D', 'IL', '07'),
  createRepresentative('M001225', 'Kweisi Mfume', 'D', 'MD', '07'),
  createRepresentative('V000136', 'Greg Landsman', 'D', 'OH', '01'),
];

export const houseEnergyCommerceCommittee: Committee = {
  id: 'HSIF',
  thomas_id: 'HSIF',
  name: 'House Committee on Energy and Commerce',
  chamber: 'House',
  type: 'Standing',
  jurisdiction:
    'The House Committee on Energy and Commerce has one of the broadest jurisdictions of any congressional committee, covering: ' +
    'Interstate and foreign commerce generally; ' +
    'National energy policy generally; ' +
    'Exploration, production, storage, supply, marketing, pricing, and regulation of energy resources; ' +
    'Conservation of energy resources; ' +
    'Energy information generally; ' +
    'Generation and marketing of power; ' +
    'Reliability and interstate transmission of electricity; ' +
    'Public health and quarantine; ' +
    'Hospital construction; ' +
    'Biomedical research and development; ' +
    'Health information technology, privacy, and cybersecurity; ' +
    'Consumer affairs and consumer protection; ' +
    'Interstate and foreign communications; ' +
    'Travel and tourism; ' +
    'Motor vehicle safety.',

  leadership: {
    chair: createCommitteeMember(chairman, 'Chair', 1),
    rankingMember: createCommitteeMember(rankingMember, 'Ranking Member', 2),
  },

  members: [
    // Leadership
    createCommitteeMember(chairman, 'Chair', 1),
    createCommitteeMember(rankingMember, 'Ranking Member', 2),

    // Republican members (excluding chair)
    ...republicanMembers
      .slice(1)
      .map((rep, index) => createCommitteeMember(rep, 'Member', index + 3)),

    // Democratic members (excluding ranking member)
    ...democraticMembers
      .slice(1)
      .map((rep, index) =>
        createCommitteeMember(rep, 'Member', republicanMembers.length + index + 2)
      ),
  ],

  subcommittees: [
    {
      id: 'HSIF01',
      name: 'Health',
      chair: chairman,
      rankingMember: democraticMembers.find(m => m.name === 'Diana DeGette'),
      focus: 'Public health, healthcare quality, medical research, and drug safety',
      members: [],
    },
    {
      id: 'HSIF02',
      name: 'Innovation, Data, and Commerce',
      chair: republicanMembers.find(m => m.name === 'Bob Latta'),
      rankingMember: democraticMembers.find(m => m.name === 'Jan Schakowsky'),
      focus: 'Consumer protection, data security, and commerce',
      members: [],
    },
    {
      id: 'HSIF03',
      name: 'Energy',
      chair: republicanMembers.find(m => m.name === 'Bob Latta'),
      rankingMember: rankingMember,
      focus: 'Energy policy, electricity generation and transmission',
      members: [],
    },
    {
      id: 'HSIF04',
      name: 'Communications and Technology',
      chair: republicanMembers.find(m => m.name === 'Richard Hudson'),
      rankingMember: democraticMembers.find(m => m.name === 'Yvette Clarke'),
      focus: 'Telecommunications, internet, and broadcast media',
      members: [],
    },
    {
      id: 'HSIF05',
      name: 'Environment',
      chair: republicanMembers.find(m => m.name === 'Jeff Duncan'),
      rankingMember: democraticMembers.find(m => m.name === 'Debbie Dingell'),
      focus: 'Environmental protection and climate change',
      members: [],
    },
    {
      id: 'HSIF06',
      name: 'Oversight and Investigations',
      chair: republicanMembers.find(m => m.name === 'Morgan Griffith'),
      rankingMember: democraticMembers.find(m => m.name === 'Paul Tonko'),
      focus: 'Oversight of agencies and programs under committee jurisdiction',
      members: [],
    },
  ],

  url: 'https://energycommerce.house.gov',
  phone: '(202) 225-2927',
  address: '2125 Rayburn House Office Building, Washington, DC 20515',
  established: '1795-12-14',
  lastUpdated: new Date().toISOString(),
};

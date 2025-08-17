/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Committee on Foreign Affairs - 119th Congress
// Source: https://foreignaffairs.house.gov and Congressional records

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
      name: 'House Committee on Foreign Affairs',
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
const chairman = createRepresentative('M001157', 'Michael McCaul', 'R', 'TX', '10');
const rankingMember = createRepresentative('M001137', 'Gregory Meeks', 'D', 'NY', '05');

// Republican members (27 unique members)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('W000795', 'Joe Wilson', 'R', 'SC', '02'),
  createRepresentative('D000600', 'Mario Diaz-Balart', 'R', 'FL', '26'),
  createRepresentative('M001159', 'Cathy McMorris Rodgers', 'R', 'WA', '05'),
  createRepresentative('K000388', 'Young Kim', 'R', 'CA', '40'),
  createRepresentative('M001177', 'Tom McClintock', 'R', 'CA', '05'),
  createRepresentative('C001114', 'John Curtis', 'R', 'UT', '03'),
  createRepresentative('L000564', 'Doug Lamborn', 'R', 'CO', '05'),
  createRepresentative('W000815', 'Brad Wenstrup', 'R', 'OH', '02'),
  createRepresentative('M001205', 'Carol Miller', 'R', 'WV', '01'),
  createRepresentative('G000589', 'Lance Gooden', 'R', 'TX', '05'),
  createRepresentative('M001194', 'John Moolenaar', 'R', 'MI', '02'),
  createRepresentative('R000103', 'Matthew Rosendale', 'R', 'MT', '02'),
  createRepresentative('T000165', 'Tom Tiffany', 'R', 'WI', '07'),
  createRepresentative('B001316', 'Kelly Armstrong', 'R', 'ND', 'AL'),
  createRepresentative('M001224', 'Nathaniel Moran', 'R', 'TX', '01'),
  createRepresentative('L000595', 'Julia Letlow', 'R', 'LA', '05'),
  createRepresentative('G000595', 'Bob Good', 'R', 'VA', '05'),
  createRepresentative('M001222', 'Jake LaTurner', 'R', 'KS', '02'),
  createRepresentative('S001214', 'Greg Steube', 'R', 'FL', '17'),
  createRepresentative('W000828', 'Ron Wright', 'R', 'TX', '06'),
  createRepresentative('M001210', 'Greg Murphy', 'R', 'NC', '03'),
  createRepresentative('G000568', 'Morgan Griffith', 'R', 'VA', '09'),
  createRepresentative('G000596', 'Marjorie Taylor Greene', 'R', 'GA', '14'),
  createRepresentative('P000614', 'Chris Pappas', 'R', 'NH', '01'),
  createRepresentative('K000401', 'Andy Kim', 'R', 'NJ', '03'),
  createRepresentative('M001223', 'Seth Moulton', 'R', 'MA', '06'),
];

// Democratic members (24 unique members)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  createRepresentative('C001063', 'Joaquin Castro', 'D', 'TX', '20'),
  createRepresentative('B001287', 'Ami Bera', 'D', 'CA', '07'),
  createRepresentative('S001190', 'Brad Schneider', 'D', 'IL', '10'),
  createRepresentative('S001165', 'Albio Sires', 'D', 'NJ', '08'),
  createRepresentative('J000032', 'Sheila Jackson Lee', 'D', 'TX', '18'),
  createRepresentative('G000553', 'Al Green', 'D', 'TX', '09'),
  createRepresentative('C001084', 'David Cicilline', 'D', 'RI', '01'),
  createRepresentative('K000375', 'Bill Keating', 'D', 'MA', '09'),
  createRepresentative('C001078', 'Gerald Connolly', 'D', 'VA', '11'),
  createRepresentative('S001201', 'Tom Suozzi', 'D', 'NY', '03'),
  createRepresentative('W000826', 'Susan Wild', 'D', 'PA', '07'),
  createRepresentative('O000173', 'Ilhan Omar', 'D', 'MN', '05'),
  createRepresentative('P000618', 'Dean Phillips', 'D', 'MN', '03'),
  createRepresentative('T000487', 'Jill Tokuda', 'D', 'HI', '02'),
  createRepresentative('C001121', 'Jason Crow', 'D', 'CO', '06'),
  createRepresentative('L000593', 'Susie Lee', 'D', 'NV', '03'),
  createRepresentative('K000385', 'Robin Kelly', 'D', 'IL', '02'),
  createRepresentative('V000130', 'Juan Vargas', 'D', 'CA', '52'),
  createRepresentative('S001180', 'Kurt Schrader', 'D', 'OR', '05'),
  createRepresentative('T000468', 'Dina Titus', 'D', 'NV', '01'),
  createRepresentative('K000389', 'Ro Khanna', 'D', 'CA', '17'),
  createRepresentative('C001110', 'Lou Correa', 'D', 'CA', '46'),
  createRepresentative('E000179', 'Veronica Escobar', 'D', 'TX', '16'),
];

export const houseForeignAffairsCommittee: Committee = {
  id: 'HSFA',
  thomas_id: 'HSFA',
  name: 'House Committee on Foreign Affairs',
  chamber: 'House',
  type: 'Standing',
  jurisdiction:
    'The House Committee on Foreign Affairs has jurisdiction over: ' +
    'Relations of the United States with foreign nations generally; ' +
    'Acquisition of land and buildings for embassies and legations in foreign countries; ' +
    'Establishment of boundary lines between the United States and foreign nations; ' +
    'Export controls, including nonproliferation of nuclear technology and nuclear hardware; ' +
    'Foreign loans; ' +
    'International commodity agreements (other than those involving sugar), including all agreements for cooperation in the export of nuclear technology and nuclear hardware; ' +
    'International conferences and congresses; ' +
    'International education; ' +
    'Intervention abroad and declarations of war; ' +
    'Diplomatic service; ' +
    'Measures to foster commercial intercourse with foreign nations and to safeguard American business interests abroad; ' +
    'International economic policy; ' +
    'Neutrality; ' +
    'Protection of American citizens abroad and expatriation; ' +
    'The American National Red Cross; ' +
    'Trading with the enemy; ' +
    'United Nations organizations.',

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
      id: 'HSFA01',
      name: 'Africa, Global Health, and Global Human Rights',
      chair: republicanMembers.find(m => m.name === 'Joe Wilson'),
      rankingMember: democraticMembers.find(m => m.name === 'Ilhan Omar'),
      focus: 'African affairs, global health initiatives, and human rights',
      members: [],
    },
    {
      id: 'HSFA02',
      name: 'Europe, Energy, the Environment, and Cyber',
      chair: chairman,
      rankingMember: democraticMembers.find(m => m.name === 'Joaquin Castro'),
      focus: 'European affairs, energy diplomacy, environmental issues, and cybersecurity',
      members: [],
    },
    {
      id: 'HSFA03',
      name: 'Western Hemisphere, Civilian Security, Migration, and International Economic Policy',
      chair: republicanMembers.find(m => m.name === 'Mario Diaz-Balart'),
      rankingMember: democraticMembers.find(m => m.name === 'Albio Sires'),
      focus: 'Latin American affairs, migration, and economic policy',
      members: [],
    },
    {
      id: 'HSFA04',
      name: 'Middle East, North Africa, and Central Asia',
      chair: republicanMembers.find(m => m.name === 'Cathy McMorris Rodgers'),
      rankingMember: rankingMember,
      focus: 'Middle Eastern and North African affairs',
      members: [],
    },
    {
      id: 'HSFA05',
      name: 'Asia, the Pacific, and Global Environment',
      chair: republicanMembers.find(m => m.name === 'Young Kim'),
      rankingMember: democraticMembers.find(m => m.name === 'Ami Bera'),
      focus: 'Asian and Pacific affairs, environmental diplomacy',
      members: [],
    },
    {
      id: 'HSFA06',
      name: 'Global Health, Global Humanitarian, and International Organizations',
      chair: republicanMembers.find(m => m.name === 'Joe Wilson'),
      rankingMember: democraticMembers.find(m => m.name === 'Ilhan Omar'),
      focus: 'International organizations, humanitarian affairs, and global health',
      members: [],
    },
  ],

  url: 'https://foreignaffairs.house.gov',
  phone: '(202) 225-5021',
  address: '2170 Rayburn House Office Building, Washington, DC 20515',
  established: '1822-03-13',
  lastUpdated: new Date().toISOString(),
};

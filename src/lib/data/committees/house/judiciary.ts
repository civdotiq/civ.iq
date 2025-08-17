/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Committee on the Judiciary - 119th Congress
// Source: https://judiciary.house.gov and Congressional records

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
      name: 'House Committee on the Judiciary',
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
const chairman = createRepresentative('J000289', 'Jim Jordan', 'R', 'OH', '04');
const rankingMember = createRepresentative('R000606', 'Jamie Raskin', 'D', 'MD', '08');
const viceRankingMember = createRepresentative('B001318', 'Becca Balint', 'D', 'VT', 'AL');

// Republican members (25 total)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('I000056', 'Darrell Issa', 'R', 'CA', '48'),
  createRepresentative('B001302', 'Andy Biggs', 'R', 'AZ', '05'),
  createRepresentative('M001177', 'Tom McClintock', 'R', 'CA', '05'),
  createRepresentative('T000165', 'Tom Tiffany', 'R', 'WI', '07'),
  createRepresentative('M001184', 'Thomas Massie', 'R', 'KY', '04'),
  createRepresentative('R000614', 'Chip Roy', 'R', 'TX', '21'),
  createRepresentative('F000471', 'Scott Fitzgerald', 'R', 'WI', '05'),
  createRepresentative('C001118', 'Ben Cline', 'R', 'VA', '06'),
  createRepresentative('G000589', 'Lance Gooden', 'R', 'TX', '05'),
  createRepresentative('V000133', 'Jeff Van Drew', 'R', 'NJ', '02'),
  createRepresentative('N000238', 'Troy Nehls', 'R', 'TX', '22'),
  createRepresentative('M001221', 'Barry Moore', 'R', 'AL', '02'),
  createRepresentative('K000397', 'Kevin Kiley', 'R', 'CA', '03'),
  createRepresentative('H001091', 'Harriet Hageman', 'R', 'WY', 'AL'),
  createRepresentative('L000603', 'Laurel Lee', 'R', 'FL', '15'),
  createRepresentative('H001095', 'Wesley Hunt', 'R', 'TX', '38'),
  createRepresentative('F000478', 'Russell Fry', 'R', 'SC', '07'),
  createRepresentative('G000576', 'Glenn Grothman', 'R', 'WI', '06'),
  createRepresentative('K000601', 'Brad Knott', 'R', 'NC', '13'),
  createRepresentative('H001093', 'Mark Harris', 'R', 'NC', '09'),
  createRepresentative('O000175', 'Bob Onder', 'R', 'MO', '03'),
  createRepresentative('S001225', 'Derek Schmidt', 'R', 'KS', '02'),
  createRepresentative('G000601', 'Brandon Gill', 'R', 'TX', '14'),
  createRepresentative('B001322', 'Michael Baumgartner', 'R', 'WA', '05'),
];

// Democratic members (19 total)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  viceRankingMember,
  createRepresentative('N000002', 'Jerry Nadler', 'D', 'NY', '12'),
  createRepresentative('L000397', 'Zoe Lofgren', 'D', 'CA', '18'),
  createRepresentative('C001068', 'Steve Cohen', 'D', 'TN', '09'),
  createRepresentative('J000288', 'Hank Johnson', 'D', 'GA', '04'),
  createRepresentative('S001193', 'Eric Swalwell', 'D', 'CA', '14'),
  createRepresentative('L000582', 'Ted Lieu', 'D', 'CA', '36'),
  createRepresentative('J000298', 'Pramila Jayapal', 'D', 'WA', '07'),
  createRepresentative('C001110', 'Lou Correa', 'D', 'CA', '46'),
  createRepresentative('S001215', 'Mary Gay Scanlon', 'D', 'PA', '05'),
  createRepresentative('N000191', 'Joe Neguse', 'D', 'CO', '02'),
  createRepresentative('M001208', 'Lucy McBath', 'D', 'GA', '07'),
  createRepresentative('R000305', 'Deborah Ross', 'D', 'NC', '02'),
  createRepresentative('G000586', 'Chuy García', 'D', 'IL', '04'),
  createRepresentative('K000400', 'Sydney Kamlager-Dove', 'D', 'CA', '37'),
  createRepresentative('M001237', 'Jared Moskowitz', 'D', 'FL', '23'),
  createRepresentative('G000599', 'Dan Goldman', 'D', 'NY', '10'),
  createRepresentative('C001134', 'Jasmine Crockett', 'D', 'TX', '30'),
];

export const houseJudiciaryCommittee: Committee = {
  id: 'HSJU',
  thomas_id: 'HSJU',
  name: 'House Committee on the Judiciary',
  chamber: 'House',
  type: 'Standing',
  jurisdiction:
    'The House Committee on the Judiciary has jurisdiction over matters relating to the administration of justice in federal courts, administrative bodies, and law enforcement agencies. Its jurisdiction includes: ' +
    'The judiciary and judicial proceedings, civil and criminal; ' +
    'Administrative practice and procedure; ' +
    'Apportionment of Representatives; ' +
    'Bankruptcy, mutiny, espionage, and counterfeiting; ' +
    'Civil liberties; ' +
    'Constitutional amendments; ' +
    'Criminal law enforcement; ' +
    'Federal courts and judges, and local courts in the Territories and possessions; ' +
    'Immigration policy and non-border enforcement; ' +
    'Interstate compacts generally; ' +
    'Claims against the United States; ' +
    'Members of Congress, attendance of members, Delegates, and the Resident Commissioner; and their acceptance of incompatible offices; ' +
    'National penitentiaries; ' +
    'Patents, the Patent and Trademark Office, copyrights, and trademarks; ' +
    'Presidential succession; ' +
    'Protection of trade and commerce against unlawful restraints and monopolies; ' +
    'Revision and codification of the Statutes of the United States; ' +
    'State and territorial boundary lines; ' +
    'Subversive activities affecting the internal security of the United States.',

  leadership: {
    chair: createCommitteeMember(chairman, 'Chair', 1),
    rankingMember: createCommitteeMember(rankingMember, 'Ranking Member', 2),
    vice_chair: createCommitteeMember(viceRankingMember, 'Vice Chair', 3),
  },

  members: [
    // Leadership
    createCommitteeMember(chairman, 'Chair', 1),
    createCommitteeMember(rankingMember, 'Ranking Member', 2),
    createCommitteeMember(viceRankingMember, 'Vice Chair', 3),

    // Republican members (excluding chair)
    ...republicanMembers
      .slice(1)
      .map((rep, index) => createCommitteeMember(rep, 'Member', index + 4)),

    // Democratic members (excluding ranking member and vice ranking)
    ...democraticMembers
      .slice(2)
      .map((rep, index) =>
        createCommitteeMember(rep, 'Member', republicanMembers.length + index + 3)
      ),
  ],

  subcommittees: [
    {
      id: 'HSJU01',
      name: 'Administrative State, Regulatory Reform, and Antitrust',
      chair: republicanMembers.find(m => m.name === 'Scott Fitzgerald'),
      rankingMember: democraticMembers.find(m => m.name === 'Jerry Nadler'),
      focus: 'Regulatory reform, administrative law, and antitrust matters',
      members: [],
    },
    {
      id: 'HSJU02',
      name: 'The Constitution and Limited Government',
      chair: republicanMembers.find(m => m.name === 'Chip Roy'),
      rankingMember: democraticMembers.find(m => m.name === 'Mary Gay Scanlon'),
      focus: 'Constitutional issues and limited government principles',
      members: [],
    },
    {
      id: 'HSJU03',
      name: 'Courts, Intellectual Property, Artificial Intelligence, and the Internet',
      chair: republicanMembers.find(m => m.name === 'Darrell Issa'),
      rankingMember: democraticMembers.find(m => m.name === 'Hank Johnson'),
      focus: 'Federal courts, intellectual property, AI policy, and internet regulation',
      members: [],
    },
    {
      id: 'HSJU04',
      name: 'Crime and Federal Government Surveillance',
      chair: republicanMembers.find(m => m.name === 'Andy Biggs'),
      rankingMember: democraticMembers.find(m => m.name === 'Lucy McBath'),
      focus: 'Criminal justice and government surveillance programs',
      members: [],
    },
    {
      id: 'HSJU05',
      name: 'Immigration Integrity, Security, and Enforcement',
      chair: republicanMembers.find(m => m.name === 'Tom McClintock'),
      rankingMember: democraticMembers.find(m => m.name === 'Pramila Jayapal'),
      focus: 'Immigration policy and enforcement',
      members: [],
    },
    {
      id: 'HSJU06',
      name: 'Oversight',
      chair: republicanMembers.find(m => m.name === 'Jeff Van Drew'),
      rankingMember: democraticMembers.find(m => m.name === 'Jasmine Crockett'),
      focus: 'Oversight of executive branch agencies',
      members: [],
    },
  ],

  url: 'https://judiciary.house.gov',
  phone: '(202) 225-3951',
  address: '2138 Rayburn House Office Building, Washington, DC 20515',
  established: '1813-06-03',
  lastUpdated: new Date().toISOString(),
};

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Committee on Ways and Means - 119th Congress
// Source: https://waysandmeans.house.gov and Congressional records

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
  votingMember: true,
  role: 'Representative',
  terms: [
    {
      congress: '119',
      startYear: '2025',
      endYear: '2027',
    },
  ],
  committees: [
    {
      name: 'House Committee on Ways and Means',
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
const chairman = createRepresentative('S001195', 'Jason Smith', 'R', 'MO', '08');
const rankingMember = createRepresentative('N000015', 'Richard E. Neal', 'D', 'MA', '01');

// Republican members (25 total)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('B001260', 'Vern Buchanan', 'R', 'FL', '16'),
  createRepresentative('S001172', 'Adrian Smith', 'R', 'NE', '03'),
  createRepresentative('K000376', 'Mike Kelly', 'R', 'PA', '16'),
  createRepresentative('S001183', 'David Schweikert', 'R', 'AZ', '01'),
  createRepresentative('L000585', 'Darin LaHood', 'R', 'IL', '16'),
  createRepresentative('W000815', 'Brad Wenstrup', 'R', 'OH', '02'),
  createRepresentative('A000375', 'Jodey Arrington', 'R', 'TX', '19'),
  createRepresentative('F000465', 'Drew Ferguson', 'R', 'GA', '03'),
  createRepresentative('E000298', 'Ron Estes', 'R', 'KS', '04'),
  createRepresentative('S001199', 'Lloyd Smucker', 'R', 'PA', '11'),
  createRepresentative('H001082', 'Kevin Hern', 'R', 'OK', '01'),
  createRepresentative('M001205', 'Carol Miller', 'R', 'WV', '01'),
  createRepresentative('M001210', 'Greg Murphy', 'R', 'NC', '03'),
  createRepresentative('K000392', 'David Kustoff', 'R', 'TN', '08'),
  createRepresentative('F000466', 'Brian Fitzpatrick', 'R', 'PA', '01'),
  createRepresentative('S001214', 'Greg Steube', 'R', 'FL', '17'),
  createRepresentative('T000478', 'Claudia Tenney', 'R', 'NY', '24'),
  createRepresentative('F000470', 'Michelle Fischbach', 'R', 'MN', '07'),
  createRepresentative('M001213', 'Blake Moore', 'R', 'UT', '01'),
  createRepresentative('S001135', 'Michelle Steel', 'R', 'CA', '45'),
  createRepresentative('V000134', 'Beth Van Duyne', 'R', 'TX', '24'),
  createRepresentative('F000446', 'Randy Feenstra', 'R', 'IA', '04'),
  createRepresentative('M000317', 'Nicole Malliotakis', 'R', 'NY', '11'),
  createRepresentative('C001126', 'Mike Carey', 'R', 'OH', '15'),
];

// Democratic members (17 total)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  createRepresentative('D000399', 'Lloyd Doggett', 'D', 'TX', '37'),
  createRepresentative('T000460', 'Mike Thompson', 'D', 'CA', '04'),
  createRepresentative('L000557', 'John B. Larson', 'D', 'CT', '01'),
  createRepresentative('B000574', 'Earl Blumenauer', 'D', 'OR', '03'),
  createRepresentative('P000096', 'Bill Pascrell Jr.', 'D', 'NJ', '09'),
  createRepresentative('D000096', 'Danny K. Davis', 'D', 'IL', '07'),
  createRepresentative('S001156', 'Linda T. Sánchez', 'D', 'CA', '38'),
  createRepresentative('H001038', 'Brian Higgins', 'D', 'NY', '26'),
  createRepresentative('S001185', 'Terri A. Sewell', 'D', 'AL', '07'),
  createRepresentative('D000617', 'Suzan DelBene', 'D', 'WA', '01'),
  createRepresentative('C001080', 'Judy Chu', 'D', 'CA', '28'),
  createRepresentative('M001160', 'Gwen Moore', 'D', 'WI', '04'),
  createRepresentative('K000380', 'Dan Kildee', 'D', 'MI', '08'),
  createRepresentative('B001292', 'Don Beyer', 'D', 'VA', '08'),
  createRepresentative('E000296', 'Dwight Evans', 'D', 'PA', '03'),
  createRepresentative('H001066', 'Steven Horsford', 'D', 'NV', '04'),
  createRepresentative('P000613', 'Jimmy Panetta', 'D', 'CA', '19'),
  createRepresentative('G000585', 'Jimmy Gomez', 'D', 'CA', '34'),
];

export const houseWaysMeansCommittee: Committee = {
  id: 'HSWM',
  thomas_id: 'HSWM',
  name: 'House Committee on Ways and Means',
  chamber: 'House',
  type: 'Standing',
  jurisdiction:
    'The House Committee on Ways and Means has jurisdiction over: ' +
    'Revenue measures generally; ' +
    'Reciprocal trade agreements; ' +
    'Revenue measures relating to insular possessions; ' +
    'Bonded debt of the United States, subject to the last sentence of clause 4(f); ' +
    'Deposit of public monies; ' +
    'Transportation of dutiable goods; ' +
    'Tax exempt foundations and charitable trusts; ' +
    'National social security (except health care and facilities programs that are supported from general revenues as opposed to payroll deductions and except work incentive programs).',

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
      id: 'HSWM01',
      name: 'Health',
      chair: republicanMembers.find(m => m.name === 'Vern Buchanan'),
      rankingMember: democraticMembers.find(m => m.name === 'Lloyd Doggett'),
      focus: 'Medicare, health insurance, and public health programs',
      members: [],
    },
    {
      id: 'HSWM02',
      name: 'Oversight',
      chair: republicanMembers.find(m => m.name === 'David Schweikert'),
      rankingMember: democraticMembers.find(m => m.name === 'Bill Pascrell Jr.'),
      focus: 'Oversight of tax administration and government programs',
      members: [],
    },
    {
      id: 'HSWM03',
      name: 'Social Security',
      chair: republicanMembers.find(m => m.name === 'Drew Ferguson'),
      rankingMember: democraticMembers.find(m => m.name === 'John B. Larson'),
      focus: 'Social Security programs and disability insurance',
      members: [],
    },
    {
      id: 'HSWM04',
      name: 'Tax',
      chair: republicanMembers.find(m => m.name === 'Mike Kelly'),
      rankingMember: democraticMembers.find(m => m.name === 'Mike Thompson'),
      focus: 'Tax policy and Internal Revenue Code',
      members: [],
    },
    {
      id: 'HSWM05',
      name: 'Trade',
      chair: republicanMembers.find(m => m.name === 'Adrian Smith'),
      rankingMember: democraticMembers.find(m => m.name === 'Earl Blumenauer'),
      focus: 'International trade agreements and customs',
      members: [],
    },
    {
      id: 'HSWM06',
      name: 'Work and Welfare',
      chair: republicanMembers.find(m => m.name === 'Darin LaHood'),
      rankingMember: democraticMembers.find(m => m.name === 'Danny K. Davis'),
      focus: 'Welfare programs and work requirements',
      members: [],
    },
  ],

  url: 'https://waysandmeans.house.gov',
  phone: '(202) 225-3625',
  address: '1102 Longworth House Office Building, Washington, DC 20515',
  established: '1789-04-02',
  lastUpdated: new Date().toISOString(),
};

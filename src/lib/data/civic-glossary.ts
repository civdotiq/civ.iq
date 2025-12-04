/**
 * Civic Glossary - Definitions for civic and legislative terms
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: GlossaryCategory;
  relatedTerms?: string[];
  example?: string;
}

export type GlossaryCategory =
  | 'legislative-process'
  | 'congress'
  | 'elections'
  | 'committees'
  | 'voting'
  | 'executive'
  | 'judiciary'
  | 'state-government'
  | 'campaign-finance';

export const GLOSSARY_CATEGORIES: Record<GlossaryCategory, string> = {
  'legislative-process': 'Legislative Process',
  congress: 'Congress',
  elections: 'Elections',
  committees: 'Committees',
  voting: 'Voting',
  executive: 'Executive Branch',
  judiciary: 'Judiciary',
  'state-government': 'State Government',
  'campaign-finance': 'Campaign Finance',
};

export const CIVIC_GLOSSARY: GlossaryTerm[] = [
  // Legislative Process
  {
    term: 'Bill',
    definition:
      'A proposed law presented to Congress for consideration. Bills can originate in either the House or Senate, except revenue bills which must start in the House.',
    category: 'legislative-process',
    relatedTerms: ['Resolution', 'Act', 'Law'],
    example: 'H.R. 1234 is a bill introduced in the House of Representatives.',
  },
  {
    term: 'Resolution',
    definition:
      'A formal expression of opinion or intent by one or both chambers. Unlike bills, simple resolutions do not have the force of law.',
    category: 'legislative-process',
    relatedTerms: ['Joint Resolution', 'Concurrent Resolution', 'Simple Resolution'],
  },
  {
    term: 'Joint Resolution',
    definition:
      'A legislative measure that requires approval by both the House and Senate and the signature of the President. Has the same force as a bill when enacted.',
    category: 'legislative-process',
    relatedTerms: ['Resolution', 'Bill'],
  },
  {
    term: 'Amendment',
    definition:
      'A proposed change to a bill or resolution. Amendments can be offered during committee markup or floor debate.',
    category: 'legislative-process',
    relatedTerms: ['Substitute Amendment', 'Markup'],
  },
  {
    term: 'Markup',
    definition:
      'The process by which a congressional committee debates, amends, and rewrites proposed legislation.',
    category: 'legislative-process',
    relatedTerms: ['Amendment', 'Committee'],
  },
  {
    term: 'Cloture',
    definition:
      'A Senate procedure to end debate on a bill and bring it to a vote. Requires 60 votes (three-fifths of the Senate) to invoke.',
    category: 'legislative-process',
    relatedTerms: ['Filibuster', 'Senate'],
  },
  {
    term: 'Filibuster',
    definition:
      'A tactic used in the Senate to delay or block a vote by extending debate. Can only be ended by invoking cloture.',
    category: 'legislative-process',
    relatedTerms: ['Cloture', 'Senate'],
  },
  {
    term: 'Veto',
    definition:
      "The President's constitutional power to reject a bill passed by Congress. Congress can override a veto with a two-thirds vote in both chambers.",
    category: 'legislative-process',
    relatedTerms: ['Override', 'Pocket Veto'],
  },
  {
    term: 'Override',
    definition:
      'The process by which Congress can reject a presidential veto. Requires a two-thirds majority vote in both the House and Senate.',
    category: 'legislative-process',
    relatedTerms: ['Veto'],
  },
  {
    term: 'Pocket Veto',
    definition:
      'An indirect veto that occurs when the President does not sign a bill and Congress adjourns within 10 days of passing it.',
    category: 'legislative-process',
    relatedTerms: ['Veto'],
  },
  {
    term: 'Enrolled Bill',
    definition:
      'The final official copy of a bill that has passed both chambers in identical form, prepared for presentation to the President.',
    category: 'legislative-process',
    relatedTerms: ['Bill', 'Public Law'],
  },
  {
    term: 'Public Law',
    definition:
      'A bill or joint resolution that has been enacted into law. Assigned a public law number (e.g., P.L. 117-58).',
    category: 'legislative-process',
    relatedTerms: ['Bill', 'Enrolled Bill'],
    example: 'The Infrastructure Investment and Jobs Act became Public Law 117-58.',
  },

  // Congress
  {
    term: 'Congress',
    definition:
      'The legislative branch of the U.S. federal government, consisting of the Senate and the House of Representatives. A new Congress convenes every two years.',
    category: 'congress',
    relatedTerms: ['House of Representatives', 'Senate'],
  },
  {
    term: 'House of Representatives',
    definition:
      'The lower chamber of Congress with 435 voting members, apportioned among the states by population. Representatives serve two-year terms.',
    category: 'congress',
    relatedTerms: ['Congress', 'Senate', 'Representative'],
  },
  {
    term: 'Senate',
    definition:
      'The upper chamber of Congress with 100 members—two from each state. Senators serve six-year terms, with one-third up for election every two years.',
    category: 'congress',
    relatedTerms: ['Congress', 'House of Representatives', 'Senator'],
  },
  {
    term: 'Representative',
    definition:
      'A member of the House of Representatives. Also called a Congressman or Congresswoman.',
    category: 'congress',
    relatedTerms: ['House of Representatives', 'Congressional District'],
  },
  {
    term: 'Senator',
    definition: 'A member of the Senate. Each state has two Senators regardless of population.',
    category: 'congress',
    relatedTerms: ['Senate'],
  },
  {
    term: 'Congressional District',
    definition:
      'A geographic area represented by a single member of the House of Representatives. Districts are redrawn every 10 years after the census.',
    category: 'congress',
    relatedTerms: ['Representative', 'Redistricting', 'Apportionment'],
  },
  {
    term: 'Speaker of the House',
    definition:
      'The presiding officer of the House of Representatives and second in the presidential line of succession. Elected by the full House.',
    category: 'congress',
    relatedTerms: ['House of Representatives', 'Majority Leader'],
  },
  {
    term: 'Majority Leader',
    definition:
      'The floor leader of the majority party in each chamber. In the Senate, schedules legislation and manages floor proceedings.',
    category: 'congress',
    relatedTerms: ['Minority Leader', 'Whip'],
  },
  {
    term: 'Minority Leader',
    definition:
      'The floor leader of the minority party in each chamber. Coordinates strategy and serves as chief spokesperson for the minority.',
    category: 'congress',
    relatedTerms: ['Majority Leader', 'Whip'],
  },
  {
    term: 'Whip',
    definition:
      "A party leader responsible for counting votes, ensuring party discipline, and communicating the party's position to members.",
    category: 'congress',
    relatedTerms: ['Majority Leader', 'Minority Leader'],
  },
  {
    term: 'Delegate',
    definition:
      'A non-voting member of the House representing a U.S. territory (Puerto Rico, Guam, Virgin Islands, American Samoa, Northern Mariana Islands) or Washington D.C.',
    category: 'congress',
    relatedTerms: ['Representative', 'Resident Commissioner'],
  },
  {
    term: 'Resident Commissioner',
    definition:
      "Puerto Rico's delegate to the House of Representatives. Serves a four-year term, unlike other delegates who serve two-year terms.",
    category: 'congress',
    relatedTerms: ['Delegate'],
  },

  // Committees
  {
    term: 'Standing Committee',
    definition:
      'A permanent committee with jurisdiction over specific policy areas. Most legislation is referred to standing committees for consideration.',
    category: 'committees',
    relatedTerms: ['Select Committee', 'Joint Committee', 'Subcommittee'],
    example: 'The House Ways and Means Committee is a standing committee.',
  },
  {
    term: 'Select Committee',
    definition:
      'A temporary committee created to investigate a specific issue or perform a specific function. May also be called a special committee.',
    category: 'committees',
    relatedTerms: ['Standing Committee'],
    example: 'The January 6th Committee was a select committee.',
  },
  {
    term: 'Joint Committee',
    definition:
      'A committee composed of members from both the House and Senate. Often focused on administrative or investigative matters.',
    category: 'committees',
    relatedTerms: ['Standing Committee', 'Conference Committee'],
  },
  {
    term: 'Conference Committee',
    definition:
      'A temporary committee formed to resolve differences between House and Senate versions of a bill.',
    category: 'committees',
    relatedTerms: ['Joint Committee'],
  },
  {
    term: 'Subcommittee',
    definition:
      "A subdivision of a standing committee that focuses on a narrower policy area within the committee's jurisdiction.",
    category: 'committees',
    relatedTerms: ['Standing Committee'],
  },
  {
    term: 'Committee Chair',
    definition:
      'The member who leads a committee, typically from the majority party. Controls the agenda and presides over hearings.',
    category: 'committees',
    relatedTerms: ['Ranking Member'],
  },
  {
    term: 'Ranking Member',
    definition:
      'The senior member of the minority party on a committee. Serves as the lead spokesperson for the minority on committee matters.',
    category: 'committees',
    relatedTerms: ['Committee Chair'],
  },
  {
    term: 'Hearing',
    definition:
      'A formal meeting where a committee gathers information from witnesses through testimony. May be legislative, oversight, or investigative.',
    category: 'committees',
    relatedTerms: ['Testimony', 'Markup'],
  },

  // Voting
  {
    term: 'Roll Call Vote',
    definition:
      'A vote in which each member\'s position is recorded by name. Also called a "recorded vote" or "yea and nay vote."',
    category: 'voting',
    relatedTerms: ['Voice Vote', 'Quorum'],
  },
  {
    term: 'Voice Vote',
    definition:
      'A vote taken by members calling out "aye" or "no" together. Individual positions are not recorded.',
    category: 'voting',
    relatedTerms: ['Roll Call Vote'],
  },
  {
    term: 'Quorum',
    definition:
      'The minimum number of members required to conduct business. In the House and Senate, a quorum is a simple majority (218 and 51, respectively).',
    category: 'voting',
    relatedTerms: ['Roll Call Vote'],
  },
  {
    term: 'Unanimous Consent',
    definition:
      'A procedure allowing action without a formal vote if no member objects. Used to expedite routine business.',
    category: 'voting',
    relatedTerms: ['Voice Vote'],
  },
  {
    term: 'Party-Line Vote',
    definition: 'A vote in which most or all members vote according to their party affiliation.',
    category: 'voting',
    relatedTerms: ['Bipartisan'],
  },
  {
    term: 'Bipartisan',
    definition:
      'Involving cooperation between both major political parties. A bipartisan bill has significant support from both Democrats and Republicans.',
    category: 'voting',
    relatedTerms: ['Party-Line Vote'],
  },

  // Elections
  {
    term: 'Primary Election',
    definition:
      'An election held to determine which candidates will represent a political party in the general election.',
    category: 'elections',
    relatedTerms: ['General Election', 'Caucus'],
  },
  {
    term: 'General Election',
    definition:
      'The final election to fill a political office. For federal offices, held on the first Tuesday after the first Monday in November.',
    category: 'elections',
    relatedTerms: ['Primary Election'],
  },
  {
    term: 'Midterm Election',
    definition:
      "A general election held in the middle of a president's four-year term. All House seats and one-third of Senate seats are contested.",
    category: 'elections',
    relatedTerms: ['General Election'],
  },
  {
    term: 'Gerrymandering',
    definition:
      'The practice of drawing electoral district boundaries to favor one party or group over another.',
    category: 'elections',
    relatedTerms: ['Redistricting', 'Congressional District'],
  },
  {
    term: 'Redistricting',
    definition:
      'The process of redrawing electoral district boundaries, typically after each decennial census.',
    category: 'elections',
    relatedTerms: ['Gerrymandering', 'Apportionment'],
  },
  {
    term: 'Apportionment',
    definition:
      'The process of dividing the 435 House seats among the 50 states based on population, conducted after each census.',
    category: 'elections',
    relatedTerms: ['Redistricting', 'Census'],
  },
  {
    term: 'Incumbent',
    definition: 'A person currently holding an elected office who is seeking re-election.',
    category: 'elections',
    relatedTerms: ['Challenger'],
  },

  // Executive
  {
    term: 'Executive Order',
    definition:
      'A directive issued by the President to manage operations of the federal government. Has the force of law but can be reversed by future presidents.',
    category: 'executive',
    relatedTerms: ['Presidential Memorandum'],
  },
  {
    term: 'Cabinet',
    definition:
      'The group of senior appointed officials who head the executive departments and advise the President.',
    category: 'executive',
    relatedTerms: ['Executive Department', 'Secretary'],
  },
  {
    term: 'Executive Department',
    definition:
      'One of the 15 federal departments headed by a Cabinet secretary (e.g., Department of Defense, Department of Education).',
    category: 'executive',
    relatedTerms: ['Cabinet', 'Agency'],
  },
  {
    term: 'Agency',
    definition:
      'A federal organization created to perform a specific function, such as the EPA or NASA. May be independent or part of an executive department.',
    category: 'executive',
    relatedTerms: ['Executive Department'],
  },

  // Judiciary
  {
    term: 'Supreme Court',
    definition:
      'The highest court in the federal judiciary, consisting of nine justices who serve lifetime appointments.',
    category: 'judiciary',
    relatedTerms: ['Federal Court', 'Chief Justice'],
  },
  {
    term: 'Federal Court',
    definition:
      'A court established by the federal government to hear cases involving federal law, the Constitution, or disputes between states.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'District Court', 'Circuit Court'],
  },
  {
    term: 'Judicial Review',
    definition:
      'The power of courts to determine whether laws and government actions are constitutional. Established in Marbury v. Madison (1803).',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Unconstitutional'],
  },
  {
    term: 'Amicus Brief',
    definition:
      'A legal document filed by non-parties to provide information or arguments relevant to a case. Latin for "friend of the court."',
    category: 'judiciary',
    relatedTerms: ['Supreme Court'],
  },

  // State Government
  {
    term: 'State Legislature',
    definition:
      'The lawmaking body of a state. Most states have a bicameral legislature with a senate and house/assembly.',
    category: 'state-government',
    relatedTerms: ['Bicameral', 'General Assembly'],
  },
  {
    term: 'Governor',
    definition:
      "The chief executive of a state, responsible for implementing state laws and overseeing the state's executive branch.",
    category: 'state-government',
    relatedTerms: ['Lieutenant Governor', 'State Legislature'],
  },
  {
    term: 'Lieutenant Governor',
    definition:
      'The second-highest executive official in most states. Often presides over the state senate and succeeds the governor if needed.',
    category: 'state-government',
    relatedTerms: ['Governor'],
  },
  {
    term: 'Attorney General',
    definition:
      "The chief legal officer of a state or the federal government. Oversees the state's legal affairs and law enforcement.",
    category: 'state-government',
    relatedTerms: ['Governor'],
  },

  // Campaign Finance
  {
    term: 'PAC',
    definition:
      'Political Action Committee. An organization that raises and spends money to elect or defeat candidates, subject to contribution limits.',
    category: 'campaign-finance',
    relatedTerms: ['Super PAC', 'FEC'],
  },
  {
    term: 'Super PAC',
    definition:
      'An independent expenditure-only committee that can raise unlimited funds from individuals, corporations, and unions to support or oppose candidates.',
    category: 'campaign-finance',
    relatedTerms: ['PAC', 'Dark Money'],
  },
  {
    term: 'Dark Money',
    definition:
      'Political spending by nonprofit organizations that are not required to disclose their donors.',
    category: 'campaign-finance',
    relatedTerms: ['Super PAC', '501(c)(4)'],
  },
  {
    term: 'FEC',
    definition:
      'Federal Election Commission. The independent agency that enforces campaign finance laws for federal elections.',
    category: 'campaign-finance',
    relatedTerms: ['PAC', 'Campaign Finance'],
  },
  {
    term: 'Hard Money',
    definition:
      'Campaign contributions that are subject to federal limits and disclosure requirements.',
    category: 'campaign-finance',
    relatedTerms: ['Soft Money', 'PAC'],
  },
  {
    term: 'Soft Money',
    definition:
      'Funds raised outside federal limits, historically used for party-building activities. Largely banned by the Bipartisan Campaign Reform Act of 2002.',
    category: 'campaign-finance',
    relatedTerms: ['Hard Money'],
  },
  {
    term: 'Bundling',
    definition:
      'The practice of collecting multiple individual contributions and presenting them together to a candidate or party.',
    category: 'campaign-finance',
    relatedTerms: ['Campaign Finance'],
  },
];

// Helper functions
export function getTermsByCategory(category: GlossaryCategory): GlossaryTerm[] {
  return CIVIC_GLOSSARY.filter(term => term.category === category);
}

export function searchTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return CIVIC_GLOSSARY.filter(
    term =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery)
  );
}

export function getTermByName(name: string): GlossaryTerm | undefined {
  return CIVIC_GLOSSARY.find(term => term.term.toLowerCase() === name.toLowerCase());
}

export function getAllCategories(): GlossaryCategory[] {
  return Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[];
}

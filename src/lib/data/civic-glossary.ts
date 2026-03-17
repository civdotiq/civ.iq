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
  | 'campaign-finance'
  | 'regulatory'
  | 'budget';

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
  regulatory: 'Regulatory Process',
  budget: 'Budget & Spending',
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

  // Campaign Finance (new)
  {
    term: 'Independent Expenditure',
    definition:
      'Spending on political communications that expressly advocate for or against a candidate, made without coordination with any campaign.',
    category: 'campaign-finance',
    relatedTerms: ['Super PAC', 'FEC'],
  },
  {
    term: '501(c)(4)',
    definition:
      'A tax-exempt social welfare organization that can engage in limited political activity without disclosing its donors.',
    category: 'campaign-finance',
    relatedTerms: ['Dark Money', 'Super PAC'],
  },
  {
    term: 'Citizens United',
    definition:
      'The 2010 Supreme Court ruling (Citizens United v. FEC) that corporations and unions can spend unlimited amounts on independent political expenditures.',
    category: 'campaign-finance',
    relatedTerms: ['Super PAC', 'Independent Expenditure'],
  },
  {
    term: 'Leadership PAC',
    definition:
      'A political action committee established by a current or former officeholder to raise money for other candidates, party organizations, and political causes.',
    category: 'campaign-finance',
    relatedTerms: ['PAC', 'Bundling'],
  },
  {
    term: 'Contribution Limit',
    definition:
      'The maximum amount an individual, PAC, or party can contribute to a candidate or political committee per election cycle, as set by the FEC.',
    category: 'campaign-finance',
    relatedTerms: ['FEC', 'Hard Money', 'PAC'],
  },
  {
    term: 'Disclosure',
    definition:
      'The legal requirement for candidates, PACs, and parties to publicly report their financial activity, including contributions received and expenditures made.',
    category: 'campaign-finance',
    relatedTerms: ['FEC', 'Dark Money'],
  },
  {
    term: 'Electioneering Communication',
    definition:
      'A broadcast, cable, or satellite communication that refers to a clearly identified federal candidate and is made within 30 days of a primary or 60 days of a general election.',
    category: 'campaign-finance',
    relatedTerms: ['Independent Expenditure', 'FEC'],
  },
  {
    term: 'Public Financing',
    definition:
      'Government funding provided to qualified presidential candidates who agree to spending limits. Funded by the $3 checkoff on federal tax returns.',
    category: 'campaign-finance',
    relatedTerms: ['FEC', 'Contribution Limit'],
  },
  {
    term: 'Coordinated Expenditure',
    definition:
      'Spending made in cooperation with, or at the request of, a candidate or campaign. Subject to contribution limits unlike independent expenditures.',
    category: 'campaign-finance',
    relatedTerms: ['Independent Expenditure', 'FEC'],
  },
  {
    term: 'Lobbyist',
    definition:
      'A person who is paid to influence government decisions on behalf of an organization, industry, or interest group. Must register under the Lobbying Disclosure Act.',
    category: 'campaign-finance',
    relatedTerms: ['Lobbying Disclosure Act', 'PAC'],
  },
  {
    term: 'Lobbying Disclosure Act',
    definition:
      'A 1995 federal law requiring lobbyists to register with Congress and disclose their clients, issues, and spending.',
    category: 'campaign-finance',
    relatedTerms: ['Lobbyist'],
  },
  {
    term: 'Revolving Door',
    definition:
      'The movement of personnel between roles as legislators or regulators and positions in the industries they previously oversaw.',
    category: 'campaign-finance',
    relatedTerms: ['Lobbyist'],
  },
  {
    term: 'Earmark',
    definition:
      'A provision in legislation directing funds to a specific project, program, or organization, typically requested by a member of Congress for their district or state.',
    category: 'campaign-finance',
    relatedTerms: ['Appropriation'],
  },

  // Legislative Process (new)
  {
    term: 'Reconciliation',
    definition:
      'A special budget process that allows certain tax, spending, and debt limit legislation to pass the Senate with a simple majority (51 votes) instead of the usual 60.',
    category: 'legislative-process',
    relatedTerms: ['Filibuster', 'Cloture', 'Budget Resolution'],
  },
  {
    term: 'Omnibus Bill',
    definition:
      'A single piece of legislation that bundles together several measures, often covering multiple unrelated topics or appropriations.',
    category: 'legislative-process',
    relatedTerms: ['Appropriation', 'Continuing Resolution'],
  },
  {
    term: 'Discharge Petition',
    definition:
      'A procedure in the House requiring 218 signatures to force a bill out of committee and onto the floor for a vote, bypassing the committee chair.',
    category: 'legislative-process',
    relatedTerms: ['Standing Committee', 'Committee Chair'],
  },
  {
    term: 'Conference Report',
    definition:
      'The final version of a bill produced by a conference committee after reconciling differences between the House and Senate versions.',
    category: 'legislative-process',
    relatedTerms: ['Conference Committee', 'Enrolled Bill'],
  },
  {
    term: 'PAYGO',
    definition:
      'Pay-As-You-Go rules requiring that new spending increases or tax cuts be offset by spending reductions or revenue increases elsewhere.',
    category: 'legislative-process',
    relatedTerms: ['CBO', 'Budget Resolution'],
  },
  {
    term: 'Rider',
    definition:
      "A provision added to a bill that is not directly related to the bill's main subject, often used to pass measures that might not succeed on their own.",
    category: 'legislative-process',
    relatedTerms: ['Amendment', 'Omnibus Bill'],
  },
  {
    term: 'Engrossed Bill',
    definition:
      'The official copy of a bill as passed by one chamber, incorporating all amendments adopted during floor debate.',
    category: 'legislative-process',
    relatedTerms: ['Enrolled Bill', 'Amendment'],
  },
  {
    term: 'Suspension of the Rules',
    definition:
      'A House procedure that limits debate to 40 minutes, forbids amendments, and requires a two-thirds vote for passage. Used for non-controversial bills.',
    category: 'legislative-process',
    relatedTerms: ['Voice Vote', 'Roll Call Vote'],
  },
  {
    term: 'Continuing Resolution',
    definition:
      'Temporary legislation that funds the federal government at existing levels when regular appropriations bills have not been enacted by the start of the fiscal year.',
    category: 'legislative-process',
    relatedTerms: ['Appropriation', 'Government Shutdown'],
  },
  {
    term: 'Concurrent Resolution',
    definition:
      "A legislative measure passed by both chambers that does not require the President's signature and does not have the force of law. Used for internal congressional matters.",
    category: 'legislative-process',
    relatedTerms: ['Resolution', 'Joint Resolution'],
  },
  {
    term: 'Rule',
    definition:
      'A resolution from the House Rules Committee that sets the terms for floor debate on a bill, including time limits and which amendments may be offered.',
    category: 'legislative-process',
    relatedTerms: ['Standing Committee', 'Amendment'],
  },
  {
    term: 'Companion Bill',
    definition:
      'Identical or substantially similar legislation introduced in both the House and Senate, often to speed up the legislative process.',
    category: 'legislative-process',
    relatedTerms: ['Bill', 'Conference Committee'],
  },
  {
    term: 'Hopper',
    definition:
      "The box on the House Clerk's desk where members deposit bills for introduction. Placing a bill in the hopper is the first step in the legislative process.",
    category: 'legislative-process',
    relatedTerms: ['Bill'],
  },
  {
    term: 'Referral',
    definition:
      'The assignment of a bill to the appropriate committee(s) for consideration, typically done by the Speaker of the House or the Senate presiding officer.',
    category: 'legislative-process',
    relatedTerms: ['Standing Committee', 'Speaker of the House'],
  },
  {
    term: 'Hold',
    definition:
      'An informal practice in the Senate where a senator asks party leadership to delay floor action on a bill or nomination, effectively a one-person filibuster threat.',
    category: 'legislative-process',
    relatedTerms: ['Filibuster', 'Unanimous Consent'],
  },
  {
    term: 'Nuclear Option',
    definition:
      'A Senate procedure that changes the rules to allow a simple majority to end debate, bypassing the 60-vote cloture requirement. Used for judicial nominations since 2013.',
    category: 'legislative-process',
    relatedTerms: ['Cloture', 'Filibuster'],
  },

  // Congress (new)
  {
    term: 'CBO',
    definition:
      'Congressional Budget Office. A nonpartisan agency that provides economic and budgetary analysis to Congress, including cost estimates for proposed legislation.',
    category: 'congress',
    relatedTerms: ['GAO', 'CRS', 'Budget Resolution'],
  },
  {
    term: 'GAO',
    definition:
      'Government Accountability Office. An independent agency that audits and evaluates federal programs and expenditures for Congress.',
    category: 'congress',
    relatedTerms: ['CBO', 'CRS'],
  },
  {
    term: 'CRS',
    definition:
      'Congressional Research Service. A nonpartisan research arm of the Library of Congress that provides policy analysis and research to members of Congress.',
    category: 'congress',
    relatedTerms: ['CBO', 'GAO'],
  },
  {
    term: 'Lame Duck Session',
    definition:
      'A session of Congress that takes place after Election Day but before the new Congress is sworn in on January 3rd.',
    category: 'congress',
    relatedTerms: ['Congress'],
  },
  {
    term: 'Franking Privilege',
    definition:
      'The ability of members of Congress to send official mail to constituents without postage, using their signature (frank) in place of a stamp.',
    category: 'congress',
    relatedTerms: ['Congressional District'],
  },
  {
    term: 'Congressional Record',
    definition:
      'The official daily record of the debates and proceedings of Congress. Published by the Government Publishing Office for every day Congress is in session.',
    category: 'congress',
    relatedTerms: ['Congress'],
  },
  {
    term: 'Caucus',
    definition:
      'An informal group of members of Congress sharing an interest or characteristic. Also refers to a closed party meeting to select candidates or decide policy.',
    category: 'congress',
    relatedTerms: ['Congress', 'Primary Election'],
  },
  {
    term: 'President Pro Tempore',
    definition:
      'The senator who presides over the Senate in the absence of the Vice President. Traditionally the longest-serving member of the majority party.',
    category: 'congress',
    relatedTerms: ['Senate', 'Speaker of the House'],
  },
  {
    term: 'Appropriation',
    definition:
      'An act of Congress that provides the legal authority for federal agencies to incur obligations and make payments from the Treasury for specified purposes.',
    category: 'congress',
    relatedTerms: ['Budget Resolution', 'Continuing Resolution', 'Earmark'],
  },
  {
    term: 'Authorization',
    definition:
      'Legislation that establishes or continues a federal agency, program, or activity, and sets its policies. Separate from the appropriation that funds it.',
    category: 'congress',
    relatedTerms: ['Appropriation'],
  },
  {
    term: 'Floor',
    definition:
      'The main chamber of either the House or Senate where members debate and vote on legislation.',
    category: 'congress',
    relatedTerms: ['Roll Call Vote', 'Voice Vote'],
  },
  {
    term: 'Yield',
    definition:
      "To give up the remainder of one's speaking time on the floor to another member or back to the presiding officer.",
    category: 'congress',
    relatedTerms: ['Floor'],
  },
  {
    term: 'Sine Die',
    definition:
      'Latin for "without day." An adjournment sine die ends a session of Congress with no date set for reconvening.',
    category: 'congress',
    relatedTerms: ['Lame Duck Session', 'Congress'],
  },

  // Voting (new)
  {
    term: 'Motion to Table',
    definition:
      'A procedural motion to set aside a bill or amendment indefinitely. If passed, it effectively kills the measure without a direct vote on the merits.',
    category: 'voting',
    relatedTerms: ['Roll Call Vote', 'Amendment'],
  },
  {
    term: 'Division Vote',
    definition:
      'A vote in which members stand to be counted for or against a measure. More precise than a voice vote but does not record individual positions.',
    category: 'voting',
    relatedTerms: ['Voice Vote', 'Roll Call Vote'],
  },
  {
    term: 'Veto Override',
    definition:
      'A vote by Congress to enact a bill despite a presidential veto. Requires a two-thirds supermajority in both the House and Senate.',
    category: 'voting',
    relatedTerms: ['Veto', 'Override'],
  },
  {
    term: 'Proxy Voting',
    definition:
      'A procedure allowing a member to designate another member to cast votes on their behalf. Used in the House during the COVID-19 pandemic.',
    category: 'voting',
    relatedTerms: ['Roll Call Vote'],
  },
  {
    term: 'Teller Vote',
    definition:
      'A vote in which members walk past designated tellers who count them. Rarely used in modern congressional proceedings.',
    category: 'voting',
    relatedTerms: ['Division Vote', 'Voice Vote'],
  },
  {
    term: 'Motion to Recommit',
    definition:
      "A procedural motion to send a bill back to committee, typically with instructions. The minority party's last chance to amend or kill a bill.",
    category: 'voting',
    relatedTerms: ['Standing Committee', 'Amendment'],
  },
  {
    term: 'Recorded Vote',
    definition:
      "Any vote in which each member's position is officially recorded and made public. Synonymous with roll call vote in practice.",
    category: 'voting',
    relatedTerms: ['Roll Call Vote'],
  },
  {
    term: 'Supermajority',
    definition:
      'A voting threshold greater than a simple majority, such as two-thirds (to override a veto) or three-fifths (to invoke cloture in the Senate).',
    category: 'voting',
    relatedTerms: ['Cloture', 'Veto Override', 'Quorum'],
  },

  // Elections (new)
  {
    term: 'Electoral College',
    definition:
      'The body of 538 electors who formally elect the President and Vice President. A candidate needs 270 electoral votes to win.',
    category: 'elections',
    relatedTerms: ['General Election'],
  },
  {
    term: 'Ranked Choice Voting',
    definition:
      'An electoral system where voters rank candidates by preference. If no candidate wins a majority, the lowest-ranked candidate is eliminated and their votes redistributed.',
    category: 'elections',
    relatedTerms: ['General Election', 'Primary Election'],
  },
  {
    term: 'Ballot Initiative',
    definition:
      'A process that allows citizens to propose new laws or constitutional amendments by collecting a required number of petition signatures.',
    category: 'elections',
    relatedTerms: ['Referendum'],
  },
  {
    term: 'Referendum',
    definition:
      'A direct vote in which an entire electorate is asked to either accept or reject a particular proposal, typically a law passed by the legislature.',
    category: 'elections',
    relatedTerms: ['Ballot Initiative'],
  },
  {
    term: 'Early Voting',
    definition:
      'The process of voting before Election Day during a designated period, available in most states to increase voter access and reduce long lines.',
    category: 'elections',
    relatedTerms: ['Absentee Ballot', 'General Election'],
  },
  {
    term: 'Absentee Ballot',
    definition:
      'A ballot completed and submitted before Election Day by a voter who cannot or prefers not to vote in person.',
    category: 'elections',
    relatedTerms: ['Early Voting'],
  },
  {
    term: 'Open Primary',
    definition:
      'A primary election in which voters may participate regardless of their party registration.',
    category: 'elections',
    relatedTerms: ['Primary Election', 'Closed Primary'],
  },
  {
    term: 'Closed Primary',
    definition:
      "A primary election in which only registered members of a political party may vote for that party's candidates.",
    category: 'elections',
    relatedTerms: ['Primary Election', 'Open Primary'],
  },
  {
    term: 'Runoff Election',
    definition:
      'A second election held when no candidate achieves the required margin of victory in the first round, typically between the top two vote-getters.',
    category: 'elections',
    relatedTerms: ['General Election', 'Primary Election'],
  },
  {
    term: 'Special Election',
    definition:
      'An election held outside the regular election schedule to fill a vacancy in office caused by death, resignation, or removal.',
    category: 'elections',
    relatedTerms: ['General Election'],
  },
  {
    term: 'Voter Registration',
    definition:
      'The process by which eligible citizens enroll to vote. Requirements vary by state, with some states offering same-day registration.',
    category: 'elections',
    relatedTerms: ['General Election', 'Primary Election'],
  },
  {
    term: 'Swing State',
    definition:
      'A state where the two major political parties have similar levels of support and the outcome of elections is uncertain.',
    category: 'elections',
    relatedTerms: ['Electoral College', 'General Election'],
  },

  // Executive (new)
  {
    term: 'Signing Statement',
    definition:
      'A written comment issued by the President when signing a bill into law, sometimes used to express constitutional objections or interpret provisions.',
    category: 'executive',
    relatedTerms: ['Veto', 'Executive Order'],
  },
  {
    term: 'Executive Privilege',
    definition:
      'The power claimed by the President to resist subpoenas and other demands from Congress or the courts for information and testimony.',
    category: 'executive',
    relatedTerms: ['Executive Order'],
  },
  {
    term: 'Clemency',
    definition:
      "The President's power to grant pardons (forgiveness for a crime), commutations (reduced sentences), or reprieves (delayed punishments) for federal offenses.",
    category: 'executive',
    relatedTerms: ['Executive Order'],
  },
  {
    term: 'OIRA',
    definition:
      'Office of Information and Regulatory Affairs. A division within OMB that reviews significant federal regulations before they are published.',
    category: 'executive',
    relatedTerms: ['OMB', 'NPRM'],
  },
  {
    term: 'OMB',
    definition:
      'Office of Management and Budget. The largest office within the Executive Office of the President, responsible for the federal budget and regulatory oversight.',
    category: 'executive',
    relatedTerms: ['OIRA', 'Budget Resolution'],
  },
  {
    term: 'Presidential Memorandum',
    definition:
      'A directive from the President to executive agencies, similar to an executive order but generally not required to be published in the Federal Register.',
    category: 'executive',
    relatedTerms: ['Executive Order'],
  },
  {
    term: 'Recess Appointment',
    definition:
      'A presidential appointment made when the Senate is in recess, allowing the appointee to serve temporarily without Senate confirmation.',
    category: 'executive',
    relatedTerms: ['Senate', 'Cabinet'],
  },
  {
    term: 'Inspector General',
    definition:
      'An independent official within a federal agency who investigates waste, fraud, abuse, and mismanagement in government programs.',
    category: 'executive',
    relatedTerms: ['GAO', 'Agency'],
  },
  {
    term: 'National Security Council',
    definition:
      'A forum of senior officials who advise the President on national security and foreign policy matters.',
    category: 'executive',
    relatedTerms: ['Cabinet', 'Executive Department'],
  },
  {
    term: 'Federal Register',
    definition:
      'The daily journal of the U.S. government, publishing proposed rules, final rules, executive orders, and other official documents from federal agencies.',
    category: 'executive',
    relatedTerms: ['NPRM', 'Executive Order', 'Comment Period'],
  },
  {
    term: 'State of the Union',
    definition:
      "The annual address by the President to Congress, typically delivered in January or February, outlining the administration's legislative priorities.",
    category: 'executive',
    relatedTerms: ['Congress'],
  },

  // Judiciary (new)
  {
    term: 'Certiorari',
    definition:
      'A writ issued by the Supreme Court agreeing to review a lower court decision. The Court grants "cert" in cases it considers important.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court'],
  },
  {
    term: 'Standing',
    definition:
      'The legal right to bring a lawsuit. A plaintiff must show they suffered an actual injury caused by the defendant that the court can remedy.',
    category: 'judiciary',
    relatedTerms: ['Federal Court'],
  },
  {
    term: 'Stare Decisis',
    definition:
      'Latin for "to stand by things decided." The legal principle that courts should follow precedent established by prior decisions.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Judicial Review'],
  },
  {
    term: 'Recusal',
    definition:
      'When a judge voluntarily removes themselves from a case due to a potential conflict of interest or appearance of bias.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Federal Court'],
  },
  {
    term: 'Oral Arguments',
    definition:
      'Presentations made in person to a court by attorneys for both sides of a case. At the Supreme Court, each side typically gets 30 minutes.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Certiorari'],
  },
  {
    term: 'Injunction',
    definition:
      'A court order requiring a party to do or refrain from doing a specific act. Preliminary injunctions can block laws from taking effect while cases proceed.',
    category: 'judiciary',
    relatedTerms: ['Federal Court'],
  },
  {
    term: 'Circuit Court',
    definition:
      'A federal appellate court. The U.S. has 13 circuit courts that hear appeals from district courts within their geographic jurisdiction.',
    category: 'judiciary',
    relatedTerms: ['Federal Court', 'District Court', 'Supreme Court'],
  },
  {
    term: 'District Court',
    definition:
      'The trial courts of the federal court system. There are 94 federal judicial districts, with at least one in each state.',
    category: 'judiciary',
    relatedTerms: ['Federal Court', 'Circuit Court'],
  },
  {
    term: 'En Banc',
    definition:
      'A hearing before all judges of a court, rather than a smaller panel. Circuit courts may rehear cases en banc when the issues are particularly significant.',
    category: 'judiciary',
    relatedTerms: ['Circuit Court'],
  },
  {
    term: 'Dissent',
    definition:
      'A written opinion by a judge who disagrees with the majority decision. Dissents have no legal force but can influence future rulings.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Concurrence'],
  },
  {
    term: 'Concurrence',
    definition:
      'A written opinion by a judge who agrees with the outcome of a case but for different reasons than the majority.',
    category: 'judiciary',
    relatedTerms: ['Supreme Court', 'Dissent'],
  },
  {
    term: 'Writ of Habeas Corpus',
    definition:
      'A legal order requiring a person holding a prisoner to bring the prisoner before a court to determine if their detention is lawful.',
    category: 'judiciary',
    relatedTerms: ['Federal Court'],
  },

  // State Government (new)
  {
    term: 'Line-Item Veto',
    definition:
      'The power of some governors to reject individual provisions of a bill without vetoing the entire legislation. Not available to the President.',
    category: 'state-government',
    relatedTerms: ['Governor', 'Veto'],
  },
  {
    term: 'Home Rule',
    definition:
      'The authority granted by a state to its cities and counties to govern their own local affairs, including the power to enact local ordinances.',
    category: 'state-government',
    relatedTerms: ['State Legislature'],
  },
  {
    term: 'Interstate Compact',
    definition:
      'A formal agreement between two or more states, authorized by Congress, to address shared issues like water rights, transportation, or elections.',
    category: 'state-government',
    relatedTerms: ['State Legislature'],
  },
  {
    term: 'Unicameral',
    definition:
      'A legislature with only one chamber. Nebraska is the only U.S. state with a unicameral legislature.',
    category: 'state-government',
    relatedTerms: ['Bicameral', 'State Legislature'],
  },
  {
    term: 'Bicameral',
    definition:
      'A legislature with two separate chambers, typically a senate and a house or assembly. Used by 49 of 50 U.S. state legislatures and the U.S. Congress.',
    category: 'state-government',
    relatedTerms: ['Unicameral', 'State Legislature'],
  },
  {
    term: 'Secretary of State',
    definition:
      'A state official who typically oversees elections, business registrations, and maintains official state records. Role varies by state.',
    category: 'state-government',
    relatedTerms: ['Governor', 'Attorney General'],
  },
  {
    term: 'General Assembly',
    definition:
      'The official name for the state legislature in many states. Also used to refer to the full body of both legislative chambers.',
    category: 'state-government',
    relatedTerms: ['State Legislature', 'Bicameral'],
  },
  {
    term: 'Preemption',
    definition:
      'The principle that state law overrides local law, or federal law overrides state law, when they conflict. States may preempt local gun or rent control laws.',
    category: 'state-government',
    relatedTerms: ['Home Rule'],
  },
  {
    term: 'Recall Election',
    definition:
      'A procedure allowing voters to remove an elected official from office before their term expires, through a special election.',
    category: 'state-government',
    relatedTerms: ['Special Election', 'Governor'],
  },
  {
    term: 'State Treasurer',
    definition:
      'The state official responsible for managing state funds, investments, and financial operations.',
    category: 'state-government',
    relatedTerms: ['Governor'],
  },
  {
    term: 'Term Limit',
    definition:
      'A legal restriction on the number of terms an elected official may serve. Many states impose term limits on governors and state legislators.',
    category: 'state-government',
    relatedTerms: ['Governor', 'State Legislature'],
  },

  // Regulatory (new category)
  {
    term: 'Comment Period',
    definition:
      'The timeframe during which the public can submit written comments on a proposed federal rule. Typically 30 to 90 days.',
    category: 'regulatory',
    relatedTerms: ['NPRM', 'Federal Register', 'APA'],
  },
  {
    term: 'NPRM',
    definition:
      'Notice of Proposed Rulemaking. A public announcement by a federal agency of a proposed new regulation, published in the Federal Register to invite public comment.',
    category: 'regulatory',
    relatedTerms: ['Comment Period', 'Federal Register', 'Final Rule'],
  },
  {
    term: 'CFR',
    definition:
      'Code of Federal Regulations. The codification of all permanent rules published by federal agencies, organized by subject into 50 titles.',
    category: 'regulatory',
    relatedTerms: ['Federal Register', 'Final Rule'],
  },
  {
    term: 'Chevron Deference',
    definition:
      "A legal doctrine (from Chevron v. NRDC, 1984) under which courts defer to an agency's reasonable interpretation of an ambiguous statute it administers. Overturned by Loper Bright v. Raimondo (2024).",
    category: 'regulatory',
    relatedTerms: ['APA', 'Federal Court'],
  },
  {
    term: 'APA',
    definition:
      'Administrative Procedure Act. The 1946 federal law that governs how agencies develop and issue regulations, including requirements for public notice and comment.',
    category: 'regulatory',
    relatedTerms: ['NPRM', 'Comment Period', 'Federal Register'],
  },
  {
    term: 'Final Rule',
    definition:
      'A regulation published in the Federal Register after the comment period that has the force and effect of law.',
    category: 'regulatory',
    relatedTerms: ['NPRM', 'Comment Period', 'CFR'],
  },
  {
    term: 'Interim Final Rule',
    definition:
      'A regulation that takes effect immediately upon publication but still accepts public comments. Used when agencies determine there is good cause to skip the proposed rule stage.',
    category: 'regulatory',
    relatedTerms: ['Final Rule', 'NPRM'],
  },
  {
    term: 'Regulatory Impact Analysis',
    definition:
      'An assessment of the costs, benefits, and economic impact of a proposed regulation, required for significant rules by Executive Order 12866.',
    category: 'regulatory',
    relatedTerms: ['OIRA', 'NPRM'],
  },
  {
    term: 'Congressional Review Act',
    definition:
      "A 1996 law that allows Congress to overturn federal regulations by passing a joint resolution of disapproval within 60 legislative days of the rule's publication.",
    category: 'regulatory',
    relatedTerms: ['Joint Resolution', 'Final Rule'],
  },
  {
    term: 'Advance Notice of Proposed Rulemaking',
    definition:
      'An early public announcement that an agency is considering a new regulation, issued before a formal NPRM to gather preliminary input.',
    category: 'regulatory',
    relatedTerms: ['NPRM', 'Comment Period'],
  },
  {
    term: 'Rulemaking Petition',
    definition:
      'A formal request by a member of the public asking a federal agency to issue, amend, or repeal a regulation. Agencies must respond to petitions.',
    category: 'regulatory',
    relatedTerms: ['APA', 'NPRM'],
  },
  {
    term: 'Unified Agenda',
    definition:
      'A semiannual publication listing all regulations that federal agencies plan to propose, finalize, or review in the coming year.',
    category: 'regulatory',
    relatedTerms: ['Federal Register', 'OIRA'],
  },

  // Budget & Spending (new category)
  {
    term: 'Debt Ceiling',
    definition:
      'The maximum amount of money the federal government is authorized to borrow. Congress must vote to raise or suspend it to avoid default.',
    category: 'budget',
    relatedTerms: ['Government Shutdown', 'Appropriation'],
  },
  {
    term: 'Government Shutdown',
    definition:
      'The suspension of non-essential federal government operations when Congress fails to pass funding legislation by the start of the fiscal year.',
    category: 'budget',
    relatedTerms: ['Continuing Resolution', 'Appropriation', 'Debt Ceiling'],
  },
  {
    term: 'Mandatory Spending',
    definition:
      'Federal spending required by existing law, including Social Security, Medicare, and Medicaid. Makes up about two-thirds of the federal budget.',
    category: 'budget',
    relatedTerms: ['Discretionary Spending', 'Entitlement'],
  },
  {
    term: 'Discretionary Spending',
    definition:
      'Federal spending that Congress sets annually through the appropriations process, including defense, education, and infrastructure.',
    category: 'budget',
    relatedTerms: ['Mandatory Spending', 'Appropriation'],
  },
  {
    term: 'Entitlement',
    definition:
      'A government program that provides benefits to all eligible individuals who meet the criteria, regardless of the total cost. Examples include Social Security and Medicare.',
    category: 'budget',
    relatedTerms: ['Mandatory Spending'],
  },
  {
    term: 'Fiscal Year',
    definition:
      "The federal government's accounting year, running from October 1 through September 30. FY2026 began on October 1, 2025.",
    category: 'budget',
    relatedTerms: ['Appropriation', 'Budget Resolution'],
  },
  {
    term: 'Budget Resolution',
    definition:
      "A concurrent resolution that sets Congress's overall spending and revenue targets for the upcoming fiscal year. Not signed by the President.",
    category: 'budget',
    relatedTerms: ['Appropriation', 'Reconciliation', 'CBO'],
  },
  {
    term: 'Sequestration',
    definition:
      'Automatic, across-the-board spending cuts triggered when Congress fails to meet deficit reduction targets set by the Budget Control Act.',
    category: 'budget',
    relatedTerms: ['Discretionary Spending', 'Budget Resolution'],
  },
  {
    term: 'Deficit',
    definition:
      'The amount by which federal government spending exceeds revenue in a given fiscal year.',
    category: 'budget',
    relatedTerms: ['National Debt', 'Fiscal Year'],
  },
  {
    term: 'National Debt',
    definition:
      'The total amount of money the federal government owes to creditors, accumulated over time from annual deficits.',
    category: 'budget',
    relatedTerms: ['Deficit', 'Debt Ceiling'],
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

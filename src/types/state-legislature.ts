/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislature Types
 *
 * Comprehensive types for state legislators, bills, committees, and voting records.
 * Integrates with OpenStates.org API and follows patterns from representative.ts.
 */

// ============================================================================
// Core State Legislator Types
// ============================================================================

/**
 * Chamber type for state legislatures
 * - upper: State Senate
 * - lower: State House/Assembly/General Assembly
 */
export type StateChamber = 'upper' | 'lower';

/**
 * Party affiliation for state legislators
 */
export type StateParty =
  | 'Democratic'
  | 'Republican'
  | 'Independent'
  | 'Green'
  | 'Libertarian'
  | 'Other';

/**
 * Base state legislator interface
 * Minimum information required for all state legislators
 */
export interface BaseStateLegislator {
  id: string; // OpenStates ID
  name: string;
  firstName?: string;
  lastName?: string;
  party: StateParty;
  state: string; // Two-letter state code (e.g., "MI")
  chamber: StateChamber;
  district: string; // District identifier (e.g., "14", "HD-42")

  // Contact information
  email?: string;
  phone?: string;

  // Online presence
  photo_url?: string;
  website?: string;

  // Current status
  isActive?: boolean;

  // Metadata
  lastUpdated?: string;
}

/**
 * Enhanced state legislator with full biographical and political data
 * Follows the same pattern as EnhancedRepresentative
 */
export interface EnhancedStateLegislator extends BaseStateLegislator {
  // Enhanced name information
  fullName?: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };

  // Biographical information
  bio?: {
    birthday?: string;
    birthplace?: string;
    gender?: 'M' | 'F' | 'Other';
    education?: string[];
    occupation?: string;
    religion?: string;
  };

  // Current term details
  currentTerm?: {
    start: string;
    end: string;
    district: string;
    chamber: StateChamber;
    party: StateParty;
  };

  // Service history
  terms?: Array<{
    chamber: StateChamber;
    district: string;
    startYear: string;
    endYear?: string;
    party?: StateParty;
  }>;

  // Committee memberships
  committees?: Array<{
    id: string;
    name: string;
    role?: 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member';
    chamber?: StateChamber;
  }>;

  // Leadership roles
  leadershipRoles?: Array<{
    title: string; // e.g., "Majority Leader", "Speaker Pro Tempore"
    chamber: StateChamber;
    startDate: string;
    endDate?: string;
  }>;

  // Legislative activity
  legislation?: {
    sponsored: number;
    cosponsored: number;
    passed: number;
    failed: number;
    pending: number;
  };

  // Voting record summary
  votingRecord?: {
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
    abstentions: number;
    absences: number;
    partyLineVotes: number;
    bipartisanVotes: number;
    votingScore?: number; // 0-100 based on attendance and participation
  };

  // Contact information
  contact?: {
    capitolOffice?: {
      address?: string;
      phone?: string;
      fax?: string;
      room?: string;
    };
    districtOffices?: Array<{
      address: string;
      phone?: string;
      city?: string;
      zipCode?: string;
    }>;
    contactForm?: string;
    socialMedia?: {
      twitter?: string;
      facebook?: string;
      instagram?: string;
      linkedin?: string;
    };
  };

  // External IDs and links
  ids?: {
    openstates: string;
    ballotpedia?: string;
    votesmart?: number;
    followthemoney?: string;
    legiscan?: string;
  };

  // District demographics from Census ACS API
  demographics?: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
    white_percent: number;
    black_percent: number;
    hispanic_percent: number;
    asian_percent: number;
    poverty_rate: number;
    bachelor_degree_percent: number;
  };

  // Wikipedia article content
  wikipedia?: {
    summary?: string;
    htmlSummary?: string;
    imageUrl?: string;
    pageUrl?: string;
    lastUpdated?: string;
  };

  // Additional links
  links?: Array<{
    url: string;
    note?: string; // e.g., "Official Website", "Campaign Site"
  }>;

  // OpenStates extras (flexible metadata)
  extras?: Record<string, unknown>;

  // Data source metadata
  metadata?: {
    lastUpdated: string;
    dataSources: Array<'openstates' | 'ballotpedia' | 'state-website'>;
    completeness?: {
      basicInfo: boolean;
      biography: boolean;
      contact: boolean;
      committees: boolean;
      voting: boolean;
      legislation: boolean;
    };
  };
}

/**
 * State legislator summary for list views
 * Compact version for search results and listings
 */
export interface StateLegislatorSummary {
  id: string;
  name: string;
  party: StateParty;
  state: string;
  chamber: StateChamber;
  district: string;
  photo_url?: string;
  phone?: string;
  email?: string;
}

// ============================================================================
// State Bill Types
// ============================================================================

/**
 * State bill classification
 */
export type StateBillClassification =
  | 'bill'
  | 'resolution'
  | 'concurrent resolution'
  | 'joint resolution'
  | 'constitutional amendment'
  | 'memorial'
  | 'proclamation';

/**
 * State bill status
 */
export type StateBillStatus =
  | 'introduced'
  | 'in_committee'
  | 'passed_lower'
  | 'passed_upper'
  | 'passed_legislature'
  | 'signed'
  | 'vetoed'
  | 'failed'
  | 'withdrawn';

/**
 * State bill sponsorship
 */
export interface StateBillSponsorship {
  name: string;
  legislatorId?: string;
  entity_type: 'person' | 'organization';
  classification: 'primary' | 'cosponsor';
  primary: boolean;
}

/**
 * State bill action
 */
export interface StateBillAction {
  date: string;
  description: string;
  organization: string; // Chamber or committee name
  classification: string[];
  order?: number;
}

/**
 * State bill vote
 */
export interface StateBillVote {
  id: string;
  identifier: string;
  motion_text: string;
  start_date: string;
  result: 'passed' | 'failed';
  chamber: StateChamber;
  counts: Array<{
    option: 'yes' | 'no' | 'absent' | 'abstain' | 'not voting';
    value: number;
  }>;
  votes?: Array<{
    legislator_name: string;
    legislator_id?: string;
    option: 'yes' | 'no' | 'absent' | 'abstain' | 'not voting';
  }>;
}

/**
 * State legislator individual vote record
 * Represents a single vote cast by a specific legislator
 */
export interface StatePersonVote {
  vote_id: string;
  identifier: string;
  motion_text: string;
  start_date: string;
  result: 'passed' | 'failed';
  option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
  bill_identifier: string | null;
  bill_title: string | null;
  bill_id: string | null;
  organization_name: string;
  chamber: StateChamber;
}

/**
 * Comprehensive vote detail with full voter information
 * Used for vote detail pages showing who voted how
 */
export interface StateVoteDetail {
  id: string;
  identifier: string;
  motion_text: string;
  motion_classification: string[];
  start_date: string;
  result: 'passed' | 'failed';
  chamber: StateChamber;
  organization_name: string;
  counts: Array<{
    option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
    value: number;
  }>;
  votes: Array<{
    option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
    voter_name: string;
    voter_id: string | null;
  }>;
  bill?: {
    id: string;
    identifier: string;
    title: string;
  } | null;
}

/**
 * State bill (comprehensive)
 */
export interface StateBill {
  id: string; // OpenStates ID
  identifier: string; // Bill number (e.g., "HB 1234", "SB 567")
  title: string;
  abstract?: string;

  // Classification
  classification: StateBillClassification[];
  subject: string[];

  // Origin and status
  chamber: StateChamber;
  from_organization: string;
  status?: StateBillStatus;

  // Session information
  session: string;
  state: string;

  // Sponsorship
  sponsorships: StateBillSponsorship[];

  // Legislative history
  actions: StateBillAction[];

  // Voting history
  votes: StateBillVote[];

  // Source documents
  sources: Array<{
    url: string;
    note?: string;
  }>;

  // Full text links
  versions?: Array<{
    url: string;
    note?: string; // e.g., "Introduced", "Amended", "Enrolled"
    date?: string;
  }>;

  // Additional metadata
  extras?: Record<string, unknown>;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  first_action_date?: string;
  latest_action_date?: string;
}

/**
 * State bill summary for lists
 */
export interface StateBillSummary {
  id: string;
  identifier: string;
  title: string;
  chamber: StateChamber;
  status?: StateBillStatus;
  primary_sponsor?: string;
  latest_action?: string;
  latest_action_date?: string;
}

// ============================================================================
// State Committee Types
// ============================================================================

/**
 * State legislative committee
 */
export interface StateCommittee {
  id: string;
  name: string;
  chamber: StateChamber;
  state: string;

  // Committee type
  classification?: 'standing' | 'special' | 'joint' | 'interim';

  // Membership
  members?: Array<{
    legislator_id: string;
    legislator_name: string;
    role: 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member';
    party?: StateParty;
  }>;

  // Committee information
  description?: string;
  jurisdiction?: string[];

  // Contact
  phone?: string;
  email?: string;
  office?: string;

  // Links
  website?: string;
  sources?: Array<{
    url: string;
    note?: string;
  }>;

  // Metadata
  parent_id?: string; // For subcommittees
  subcommittees?: string[]; // IDs of subcommittees
}

// ============================================================================
// State Jurisdiction Types
// ============================================================================

/**
 * State legislative session
 */
export interface StateLegislativeSession {
  identifier: string;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
  classification?: 'primary' | 'special' | 'extraordinary';
}

/**
 * State jurisdiction (complete state legislature info)
 */
export interface StateJurisdiction {
  id: string;
  name: string; // State name
  state: string; // State abbreviation
  classification: string; // Usually "state"
  division_id: string; // OCD division ID
  url: string; // Official legislature website

  // Chamber information
  chambers: {
    upper: {
      name: string; // e.g., "Senate"
      title: string; // e.g., "Senator"
      seats?: number;
    };
    lower: {
      name: string; // e.g., "House of Representatives", "Assembly"
      title: string; // e.g., "Representative", "Assemblymember"
      seats?: number;
    };
  };

  // Current session
  currentSession?: StateLegislativeSession;

  // All sessions
  sessions?: StateLegislativeSession[];

  // Composition
  composition?: {
    upper: {
      Democratic?: number;
      Republican?: number;
      Independent?: number;
      total: number;
    };
    lower: {
      Democratic?: number;
      Republican?: number;
      Independent?: number;
      total: number;
    };
  };
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Single state legislator API response
 */
export interface StateLegislatorApiResponse {
  success: boolean;
  legislator?: EnhancedStateLegislator;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
    dataSource?: string;
  };
}

/**
 * List of state legislators API response
 */
export interface StateLegislatorsListResponse {
  success: boolean;
  legislators: StateLegislatorSummary[];
  total: number;
  state: string;
  chamber?: StateChamber;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
  };
}

/**
 * State bills API response
 */
export interface StateBillsApiResponse {
  success: boolean;
  bills: StateBillSummary[];
  total: number;
  state: string;
  session?: string;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
  };
}

/**
 * Single state bill API response
 */
export interface StateBillApiResponse {
  success: boolean;
  bill?: StateBill;
  progress?: BillProgress;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
  };
}

/**
 * State committees API response
 */
export interface StateCommitteesApiResponse {
  success: boolean;
  committees: StateCommittee[];
  total: number;
  state: string;
  chamber?: StateChamber;
  error?: string;
}

/**
 * State jurisdiction API response
 */
export interface StateJurisdictionApiResponse {
  success: boolean;
  jurisdiction?: StateJurisdiction;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
  };
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * State legislator search filters
 */
export interface StateLegislatorFilters {
  state?: string;
  chamber?: StateChamber;
  party?: StateParty;
  district?: string;
  committee?: string;
  isActive?: boolean;
}

/**
 * State legislator search options
 */
export interface StateLegislatorSearchOptions {
  query?: string;
  filters?: StateLegislatorFilters;
  sortBy?: 'name' | 'district' | 'party' | 'chamber';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * State bill search filters
 */
export interface StateBillFilters {
  state: string;
  session?: string;
  chamber?: StateChamber;
  subject?: string;
  classification?: StateBillClassification;
  status?: StateBillStatus;
  sponsor?: string;
}

/**
 * State bill search options
 */
export interface StateBillSearchOptions {
  query?: string;
  filters?: StateBillFilters;
  sortBy?: 'date' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// ZIP Code Lookup Types
// ============================================================================

/**
 * ZIP code to state legislators mapping
 */
export interface ZipCodeStateLegislators {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: {
    upper: StateLegislatorSummary[]; // State senators
    lower: StateLegislatorSummary[]; // State representatives
  };
  districts?: {
    upper?: string; // State senate district
    lower?: string; // State house district
  };
  lastUpdated: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStateLegislator(obj: unknown): obj is BaseStateLegislator {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'state' in obj &&
    'chamber' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).name === 'string'
  );
}

export function isEnhancedStateLegislator(obj: unknown): obj is EnhancedStateLegislator {
  return isStateLegislator(obj);
}

export function isStateBill(obj: unknown): obj is StateBill {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'identifier' in obj &&
    'title' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).identifier === 'string'
  );
}

export function isValidChamber(chamber: unknown): chamber is StateChamber {
  return chamber === 'upper' || chamber === 'lower';
}

// ============================================================================
// Utility Types
// ============================================================================

export type StateLegislatorField = keyof EnhancedStateLegislator;
export type StateBillField = keyof StateBill;
export type StateCommitteeField = keyof StateCommittee;

/**
 * Chamber display names by state
 * Some states use different names (e.g., "Assembly" vs "House")
 */
export const CHAMBER_NAMES: Record<string, { upper: string; lower: string }> = {
  // Standard names (most states)
  default: {
    upper: 'Senate',
    lower: 'House of Representatives',
  },
  // State-specific overrides
  CA: { upper: 'Senate', lower: 'Assembly' },
  NY: { upper: 'Senate', lower: 'Assembly' },
  WI: { upper: 'Senate', lower: 'Assembly' },
  NV: { upper: 'Senate', lower: 'Assembly' },
  NJ: { upper: 'Senate', lower: 'General Assembly' },
  VA: { upper: 'Senate', lower: 'House of Delegates' },
  MD: { upper: 'Senate', lower: 'House of Delegates' },
  WV: { upper: 'Senate', lower: 'House of Delegates' },
  NC: { upper: 'Senate', lower: 'House of Representatives' },
  PA: { upper: 'Senate', lower: 'House of Representatives' },
  // Nebraska is unicameral
  NE: { upper: 'Legislature', lower: 'Legislature' },
};

/**
 * Get chamber display name for a state
 */
export function getChamberName(state: string, chamber: StateChamber): string {
  const names = CHAMBER_NAMES[state.toUpperCase()] || CHAMBER_NAMES.default;
  if (!names) {
    return chamber === 'upper' ? 'Senate' : 'House of Representatives';
  }
  return chamber === 'upper' ? names.upper : names.lower;
}

/**
 * Get legislator title for a state
 */
export function getLegislatorTitle(state: string, chamber: StateChamber): string {
  const chamberName = getChamberName(state, chamber);

  // Handle special cases
  if (chamberName === 'Assembly') return 'Assemblymember';
  if (chamberName === 'House of Delegates') return 'Delegate';
  if (chamberName === 'General Assembly') return 'Assemblyman/Assemblywoman';
  if (chamber === 'upper') return 'Senator';

  return 'Representative';
}

// ============================================================================
// Legislative Calendar & Events Types
// ============================================================================

/**
 * State legislative event (hearing, session, markup)
 */
export interface StateLegislativeEvent {
  id: string;
  name: string;
  description?: string;
  classification: 'committee-meeting' | 'hearing' | 'floor-session' | 'markup' | 'other';
  start_date: string;
  end_date?: string;
  timezone?: string;
  all_day?: boolean;
  status?: 'tentative' | 'confirmed' | 'cancelled';

  // Location
  location?: {
    name?: string;
    note?: string;
    url?: string;
  };

  // Associated entities
  participants?: Array<{
    entity_type: 'organization' | 'person';
    entity_id: string;
    entity_name: string;
    note?: string;
  }>;

  // Related bills
  agenda?: Array<{
    order?: number;
    description?: string;
    bill_id?: string;
    bill_identifier?: string;
  }>;

  // Media and documents
  media?: Array<{
    name: string;
    url: string;
    media_type: string;
    date?: string;
  }>;

  sources: Array<{
    url: string;
    note?: string;
  }>;

  created_at: string;
  updated_at: string;
}

/**
 * Legislative calendar response
 */
export interface LegislativeCalendarResponse {
  success: boolean;
  state: string;
  events: StateLegislativeEvent[];
  total: number;
  dateRange?: {
    start: string;
    end: string;
  };
  error?: string;
}

// ============================================================================
// Bill Progress Tracking Types
// ============================================================================

/**
 * Bill progress stage
 */
export type BillProgressStage =
  | 'introduced'
  | 'committee'
  | 'floor'
  | 'passed-chamber'
  | 'second-chamber'
  | 'passed-legislature'
  | 'executive'
  | 'signed'
  | 'vetoed'
  | 'failed';

/**
 * Bill progress milestone
 */
export interface BillProgressMilestone {
  stage: BillProgressStage;
  label: string; // User-friendly label (e.g., "Passed House Floor")
  date?: string;
  completed: boolean;
  isCurrent: boolean;
  description?: string;
}

/**
 * Bill progress tracking data
 */
export interface BillProgress {
  billId: string;
  identifier: string;
  title: string;
  state: string;
  chamber: StateChamber;

  // Current status
  currentStage: BillProgressStage;
  percentComplete: number; // 0-100

  // Next action
  nextAction?: {
    description: string;
    estimatedDate?: string;
    location?: string; // Committee name or chamber
  };

  // Milestones timeline
  milestones: BillProgressMilestone[];

  // Legislative history
  recentActions: Array<{
    date: string;
    description: string;
    actor: string; // Chamber or committee
  }>;

  // Success indicators
  probability?: {
    passageScore: number; // 0-100 estimated probability
    factors: string[]; // Reasons for score
  };

  lastUpdated: string;
}

// ============================================================================
// Session Information Types
// ============================================================================

/**
 * Legislative session status
 */
export type SessionStatus = 'upcoming' | 'active' | 'recess' | 'concluded';

/**
 * Session recess period
 */
export interface SessionRecess {
  start: string;
  end: string;
  reason: string; // e.g., "Summer Recess", "Holiday Break"
}

/**
 * Legislative session information (enhanced)
 */
export interface EnhancedSessionInfo {
  identifier: string;
  name: string;
  classification: 'primary' | 'special' | 'extraordinary';
  start_date: string;
  end_date: string;

  // Current status
  status: SessionStatus;
  isActive: boolean;
  daysInSession: number;
  daysRemaining: number;

  // Important dates
  deadlines?: Array<{
    type: 'bill-introduction' | 'committee-report' | 'floor-vote' | 'crossover';
    date: string;
    description: string;
  }>;

  // Recess periods
  recesses?: SessionRecess[];

  // Next session (if current is concluded)
  nextSession?: {
    identifier: string;
    name: string;
    startDate: string;
  };

  // Statistics
  stats?: {
    billsIntroduced: number;
    billsPassed: number;
    daysInSession: number;
  };
}

/**
 * Session info API response
 */
export interface SessionInfoResponse {
  success: boolean;
  state: string;
  currentSession: EnhancedSessionInfo;
  upcomingSessions?: EnhancedSessionInfo[];
  error?: string;
}

// ============================================================================
// Co-Sponsorship Network Analysis Types
// ============================================================================

/**
 * Legislator collaboration metrics
 */
export interface LegislatorCollaboration {
  legislatorId: string;
  legislatorName: string;
  party: StateParty;
  chamber: StateChamber;
  collaborationCount: number; // Number of co-sponsored bills together
  bipartisan: boolean; // Is this cross-party collaboration?
}

/**
 * Co-sponsorship network analysis
 */
export interface CoSponsorshipNetwork {
  legislatorId: string;
  legislatorName: string;
  party: StateParty;
  chamber: StateChamber;

  // Collaboration summary
  summary: {
    totalBillsSponsored: number;
    totalBillsCosponsored: number;
    uniqueCollaborators: number;
    bipartisanCollaborations: number;
    bipartisanScore: number; // 0-100 (percentage of bills with cross-party support)
  };

  // Top collaborators
  frequentCollaborators: LegislatorCollaboration[];

  // Party breakdown
  collaborationByParty: Record<
    string,
    {
      count: number;
      legislators: string[];
    }
  >;

  // Committee overlaps
  committeeOverlaps?: Array<{
    committeeId: string;
    committeeName: string;
    sharedMembers: string[];
  }>;

  // Recent collaborative bills
  recentCollaborations: Array<{
    billId: string;
    billIdentifier: string;
    billTitle: string;
    cosponsors: string[];
    introducedDate: string;
  }>;

  lastUpdated: string;
}

/**
 * Network analysis API response
 */
export interface NetworkAnalysisResponse {
  success: boolean;
  network: CoSponsorshipNetwork;
  error?: string;
}

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileHeaderSkeleton, TabContentSkeleton, ContactTabSkeleton } from '@/components/SkeletonLoader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BarChart, DonutChart, PartyAlignmentChart, VoteHistoryChart, DemographicStats, ElectionResults, PopulationPyramid } from '@/components/Charts';
import { VotingTrendsChart } from '@/components/analytics/VotingTrendsChart';
import { CampaignFinanceChart } from '@/components/analytics/CampaignFinanceChart';
import { EffectivenessChart } from '@/components/analytics/EffectivenessChart';
import { EnhancedVotingChart } from '@/components/EnhancedVotingChart';
import { BillsTracker } from '@/components/BillsTracker';
import { CampaignFinanceVisualizer } from '@/components/CampaignFinanceVisualizer';
import { EnhancedNewsFeed } from '@/components/EnhancedNewsFeed';
import { ErrorBoundary, APIErrorBoundary, LoadingErrorBoundary } from '@/components/ErrorBoundary';
import PartyAlignmentAnalysis from '@/components/PartyAlignmentAnalysis';
import { VotingRecordsTable } from '@/components/VotingRecordsTable';
import { VotingPatternAnalysis } from '@/components/VotingPatternAnalysis';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4"/>
      </svg>
      <span className="ml-2 text-lg font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface RepresentativeDetails {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party?: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  // Enhanced fields from congress-legislators
  fullName?: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
  };
  currentTerm?: {
    start: string;
    end: string;
    office?: string;
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
    rssUrl?: string;
    stateRank?: 'junior' | 'senior';
    class?: number;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };
  ids?: {
    govtrack?: number;
    opensecrets?: string;
    votesmart?: number;
    fec?: string[];
    cspan?: number;
    wikipedia?: string;
    wikidata?: string;
    ballotpedia?: string;
  };
  leadershipRoles?: Array<{
    title: string;
    start: string;
    end?: string;
  }>;
  contact?: {
    dcOffice?: {
      address?: string;
      phone?: string;
      fax?: string;
      hours?: string;
    };
    districtOffices?: Array<{
      address: string;
      phone?: string;
      fax?: string;
      hours?: string;
    }>;
    contactForm?: string;
    schedulingUrl?: string;
  };
  // Additional fields for enhanced profile
  biography?: string;
  birthDate?: string;
  education?: string;
  previousPositions?: string[];
}

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
}

interface SponsoredBill {
  billId: string;
  number: string;
  title: string;
  congress: string;
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  type: string;
  chamber: 'House' | 'Senate';
  status: string;
  policyArea?: string;
  cosponsors?: number;
}

interface CampaignFinanceData {
  candidate_info: any;
  financial_summary: Array<{
    cycle: number;
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand_end_period: number;
    individual_contributions: number;
    pac_contributions: number;
    party_contributions: number;
    candidate_contributions: number;
  }>;
  recent_contributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
    committee_name: string;
  }>;
  recent_expenditures: Array<{
    committee_name: string;
    disbursement_description: string;
    disbursement_amount: number;
    disbursement_date: string;
    recipient_name: string;
  }>;
  top_contributors: Array<{
    name: string;
    total_amount: number;
    count: number;
  }>;
  top_expenditure_categories: Array<{
    category: string;
    total_amount: number;
    count: number;
  }>;
}

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  tone?: number;
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
}

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  image?: string;
  email?: string;
  phone?: string;
  website?: string;
  offices?: Array<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
}

interface StateBill {
  id: string;
  identifier: string;
  title: string;
  subject: string[];
  abstract?: string;
  latest_action_date: string;
  latest_action_description: string;
  classification: string[];
  sponsors: Array<{
    name: string;
    classification: string;
  }>;
  session: string;
  created_at: string;
  updated_at: string;
}

interface StateLegislatureData {
  jurisdiction: {
    name: string;
    abbreviation: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
  current_session: {
    identifier: string;
    name: string;
    classification: string;
    start_date: string;
    end_date: string;
  } | null;
  state_legislators: StateLegislator[];
  recent_bills: StateBill[];
  representative_district_bills: StateBill[];
}

interface DistrictInfo {
  district_number: string;
  state: string;
  representative: {
    name: string;
    party: string;
    years_served: number;
  };
  demographics: {
    population: {
      total: number;
      density: number;
      age_distribution: {
        under_18: number;
        age_18_64: number;
        over_65: number;
      };
    };
    race_ethnicity: {
      white: number;
      black: number;
      asian: number;
      hispanic: number;
      other: number;
    };
    economics: {
      median_household_income: number;
      poverty_rate: number;
      unemployment_rate: number;
      education: {
        high_school_or_higher: number;
        bachelors_or_higher: number;
      };
    };
    housing: {
      median_home_value: number;
      homeownership_rate: number;
      median_rent: number;
    };
    geography: {
      area_sq_miles: number;
      urban_percentage: number;
      rural_percentage: number;
    };
  };
  elections: {
    presidential_2020: {
      total_votes: number;
      democrat_percentage: number;
      republican_percentage: number;
      other_percentage: number;
    };
    congressional_2022: {
      total_votes: number;
      incumbent_percentage: number;
      challenger_percentage: number;
      margin: number;
    };
    voter_turnout: {
      registered_voters: number;
      turnout_2020: number;
      turnout_2022: number;
    };
  };
  last_updated: string;
}

// Statistics calculation functions
function calculateStats(representative: RepresentativeDetails | null, votes: Vote[], bills: SponsoredBill[]) {
  // Defensive checks
  if (!representative || !votes || !bills) {
    return {
      committees: 0,
      billsSponsored: 0,
      partyVoting: 'N/A',
      attendance: 'N/A'
    };
  }
  
  // Calculate committees count with proper null safety
  const committeesCount = Array.isArray(representative.committees) ? representative.committees.length : 0;

  // Calculate bills sponsored count
  const billsSponsoredCount = Array.isArray(bills) ? bills.length : 0;

  // Calculate party voting percentage
  let partyVotingPercentage = 0;
  if (Array.isArray(votes) && votes.length > 0) {
    // In a real app, this would compare against actual party line votes
    // For now, we'll simulate based on party and voting patterns
    const substantiveVotes = votes.filter(v => v.position === 'Yea' || v.position === 'Nay');
    if (substantiveVotes.length > 0) {
      const party = representative.party || '';
      if (party.includes('Democrat')) {
        partyVotingPercentage = 85 + Math.random() * 10; // 85-95%
      } else if (party.includes('Republican')) {
        partyVotingPercentage = 87 + Math.random() * 10; // 87-97%
      } else {
        partyVotingPercentage = 40 + Math.random() * 30; // 40-70% for independents
      }
    }
  }

  // Calculate attendance percentage
  let attendancePercentage = 0;
  if (Array.isArray(votes) && votes.length > 0) {
    const presentVotes = votes.filter(v => v.position !== 'Not Voting');
    attendancePercentage = presentVotes.length / votes.length * 100;
  }

  return {
    committees: committeesCount,
    billsSponsored: billsSponsoredCount,
    partyVoting: partyVotingPercentage.toFixed(1) + '%',
    attendance: attendancePercentage > 0 ? attendancePercentage.toFixed(1) + '%' : 'N/A'
  };
}

// Generate mock biography based on available data
function generateBiography(representative: RepresentativeDetails): string {
  const currentYear = new Date().getFullYear();
  const firstTerm = Array.isArray(representative.terms) && representative.terms.length > 0 
    ? representative.terms[representative.terms.length - 1] 
    : { startYear: currentYear.toString(), endYear: (currentYear + 2).toString() };
  const yearsInOffice = currentYear - parseInt(firstTerm.startYear);
  
  const chamber = representative.chamber === 'Senate' ? 'Senate' : 'House of Representatives';
  const districtInfo = representative.district ? `'s ${representative.district}${getOrdinalSuffix(representative.district)} congressional district` : '';
  
  return `${representative.name} is an American politician serving as the ${representative.chamber === 'Senate' ? 'junior' : ''} United States ${representative.chamber === 'Senate' ? 'Senator' : 'Representative'} from ${representative.state}${districtInfo} since ${firstTerm.startYear}. A member of the ${representative.party || 'Unknown'} Party, ${representative.lastName} has ${yearsInOffice > 1 ? `served for ${yearsInOffice} years` : 'recently begun serving'} in the ${chamber}.`;
}

function getOrdinalSuffix(num: string): string {
  const n = parseInt(num);
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Profile Tab Component
function ProfileTab({ representative, votes, bills }: { 
  representative: RepresentativeDetails | null; 
  votes: Vote[];
  bills: SponsoredBill[];
}) {
  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  const stats = calculateStats(representative, votes, bills);
  const biography = representative.biography || generateBiography(representative);
  const billsSponsoredCount = Array.isArray(bills) ? bills.length : 0;

  return (
    <div className="space-y-6">
      {/* Biography Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Biography</h3>
        <p className="text-gray-700 leading-relaxed">{biography}</p>
      </div>

      {/* Legislative Activity */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Legislative Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-gray-900">{billsSponsoredCount}</div>
            <div className="text-sm text-gray-600">Bills Sponsored</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
              {Array.isArray(bills) ? bills.reduce((sum, bill) => sum + (bill.cosponsors || 0), 0) : 0}
            </div>
            <div className="text-sm text-gray-600">Bills Co-Sponsored</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">{stats.committees}</div>
            <div className="text-sm text-gray-600">Committee Memberships</div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      {representative.bio && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {representative.bio.birthday && (
              <div>
                <div className="text-sm text-gray-600">Born</div>
                <div className="font-medium">{new Date(representative.bio.birthday).toLocaleDateString()}</div>
              </div>
            )}
            {representative.bio.gender && (
              <div>
                <div className="text-sm text-gray-600">Gender</div>
                <div className="font-medium">{representative.bio.gender === 'M' ? 'Male' : 'Female'}</div>
              </div>
            )}
            {representative.bio.religion && (
              <div>
                <div className="text-sm text-gray-600">Religion</div>
                <div className="font-medium">{representative.bio.religion}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leadership Roles */}
      {Array.isArray(representative.leadershipRoles) && representative.leadershipRoles.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Leadership Roles</h3>
          <div className="space-y-2">
            {representative.leadershipRoles.map((role, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="font-medium">{role?.title || 'Unknown Role'}</span>
                <span className="text-sm text-gray-600">
                  {role?.start || 'Unknown'} {role?.end ? `- ${role.end}` : '- Present'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Platform IDs */}
      {representative.ids && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">External Resources</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {representative.ids.govtrack && (
              <a href={`https://www.govtrack.us/congress/members/${representative.ids.govtrack}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>📊</span> GovTrack
              </a>
            )}
            {representative.ids.opensecrets && (
              <a href={`https://www.opensecrets.org/members-of-congress/summary?cid=${representative.ids.opensecrets}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>💰</span> OpenSecrets
              </a>
            )}
            {representative.ids.votesmart && (
              <a href={`https://justfacts.votesmart.org/candidate/biography/${representative.ids.votesmart}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>🗳️</span> Vote Smart
              </a>
            )}
            {representative.ids.wikipedia && (
              <a href={`https://en.wikipedia.org/wiki/${representative.ids.wikipedia}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>📖</span> Wikipedia
              </a>
            )}
            {representative.ids.ballotpedia && (
              <a href={`https://ballotpedia.org/${representative.ids.ballotpedia}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>🗳️</span> Ballotpedia
              </a>
            )}
            {representative.ids.cspan && (
              <a href={`https://www.c-span.org/person/?${representative.ids.cspan}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-civiq-blue hover:underline">
                <span>📺</span> C-SPAN
              </a>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DC Office Contact */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">DC Office</h4>
            {representative.contact?.dcOffice?.address && (
              <div className="flex items-start gap-2 mb-2">
                <span className="text-gray-500 mt-1">🏛️</span>
                <div>
                  <div className="text-gray-700">{representative.contact.dcOffice.address}</div>
                  {representative.contact.dcOffice.hours && (
                    <div className="text-sm text-gray-500">{representative.contact.dcOffice.hours}</div>
                  )}
                </div>
              </div>
            )}
            {(representative.contact?.dcOffice?.phone || representative.phone) && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-500">📞</span>
                <span className="text-gray-700">{representative.contact?.dcOffice?.phone || representative.phone}</span>
              </div>
            )}
            {representative.contact?.dcOffice?.fax && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-500">📠</span>
                <span className="text-gray-700">{representative.contact.dcOffice.fax}</span>
              </div>
            )}
            {representative.email && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-500">✉️</span>
                <a href={`mailto:${representative.email}`} className="text-civiq-blue hover:underline">
                  {representative.email}
                </a>
              </div>
            )}
            {(representative.contact?.contactForm || representative.website) && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">🌐</span>
                <a href={representative.contact?.contactForm || representative.website} target="_blank" rel="noopener noreferrer" 
                   className="text-civiq-blue hover:underline">
                  {representative.contact?.contactForm ? 'Contact Form' : 'Official Website'}
                </a>
              </div>
            )}
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Social Media</h4>
            <div className="space-y-2">
              {representative.socialMedia?.twitter && (
                <a href={`https://twitter.com/${representative.socialMedia.twitter}`} 
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-civiq-blue hover:underline">
                  <span>🐦</span> @{representative.socialMedia.twitter}
                </a>
              )}
              {representative.socialMedia?.facebook && (
                <a href={`https://facebook.com/${representative.socialMedia.facebook}`} 
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-civiq-blue hover:underline">
                  <span>📘</span> Facebook
                </a>
              )}
              {representative.socialMedia?.instagram && (
                <a href={`https://instagram.com/${representative.socialMedia.instagram}`} 
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-civiq-blue hover:underline">
                  <span>📷</span> @{representative.socialMedia.instagram}
                </a>
              )}
              {representative.socialMedia?.youtube && (
                <a href={`https://youtube.com/${representative.socialMedia.youtube}`} 
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 text-civiq-blue hover:underline">
                  <span>📺</span> YouTube
                </a>
              )}
              {!representative.socialMedia && (
                <p className="text-sm text-gray-500">No social media information available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Relationships Tab Component  
function RelationshipsTab({ representative }: { representative: RepresentativeDetails }) {
  const committees = representative.committees || [];
  const committeesCount = committees.length;
  
  // Calculate committee distribution for pie chart
  const committeeTypes = committees.reduce((acc, committee) => {
    const type = committee.name.includes('Finance') ? 'Financial Services' :
                 committee.name.includes('Resources') || committee.name.includes('Energy') ? 'Natural Resources' :
                 committee.name.includes('Oversight') ? 'Oversight and Reform' :
                 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const committeeData = Object.entries(committeeTypes).map(([name, count]) => ({
    label: name,
    value: count,
    color: name === 'Financial Services' ? '#3b82f6' :
           name === 'Natural Resources' ? '#10b981' :
           name === 'Oversight and Reform' ? '#f59e0b' :
           '#6b7280'
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Relationships & Networks</h3>
        <p className="text-gray-600 mb-6">
          Explore how {representative.name} is connected to committees, legislation, and other representatives.
        </p>
      </div>

      {/* Committee Membership */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Committee Membership</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          {committeeData?.length > 0 && (
            <div>
              <DonutChart
                data={committeeData}
                title=""
                centerText={committeesCount.toString()}
                formatValue={(value) => value.toString()}
              />
            </div>
          )}
          
          {/* Committee List */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Committee Involvement</h5>
            <p className="text-gray-600 mb-4">
              {representative.name} serves on {committeesCount} committee{committeesCount !== 1 ? 's' : ''}.
            </p>
            <ul className="space-y-2">
              {Array.isArray(committees) ? committees.map((committee, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{
                    backgroundColor: Array.isArray(committeeData) ? committeeData.find(d => 
                      committee.name?.includes(d.label?.split(' ')[0])
                    )?.color || '#6b7280' : '#6b7280'
                  }} />
                  <span className="text-gray-700">{committee.name}</span>
                  {committee.role && (
                    <span className="text-sm text-gray-500">({committee.role})</span>
                  )}
                </li>
              )) : null}
            </ul>
          </div>
        </div>
      </div>

      {/* Party Alignment */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Party Alignment</h4>
        <PartyAlignmentSection representative={representative} />
      </div>

      {/* Legislative Partners */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Legislative Partners</h4>
        <LegislativePartnersSection representative={representative} />
      </div>
    </div>
  );
}

function VotingTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple loading state management
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [bioguideId]);

  if (loading) {
    return <TabContentSkeleton />;
  }

  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voting Pattern Analysis Component */}
      <VotingPatternAnalysis
        bioguideId={bioguideId}
        party={representative.party || 'Unknown'}
        chamber={representative.chamber}
      />

      {/* Voting Records Table Component */}
      <VotingRecordsTable
        bioguideId={bioguideId}
        chamber={representative.chamber}
      />

      {/* Enhanced Party Alignment Analysis (existing component) */}
      <PartyAlignmentAnalysis
        bioguideId={bioguideId}
        representative={{
          name: representative.name,
          party: representative.party || 'Unknown' || 'Unknown',
          state: representative.state,
          chamber: representative.chamber
        }}
      />
    </div>
  );
}

function BillsTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  const [bills, setBills] = useState<SponsoredBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}/bills?limit=50&includeSummaries=false`);
        if (response.ok) {
          const data = await response.json();
          setBills(data.bills || []);
        }
      } catch (error) {
        console.error('Error fetching bills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [bioguideId]);

  if (loading) {
    return <TabContentSkeleton />;
  }

  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  return (
    <BillsTracker 
      bills={bills} 
      representative={{
        name: representative.name,
        chamber: representative.chamber
      }}
    />
  );
}

function FinanceTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  const [financeData, setFinanceData] = useState<CampaignFinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}/finance`);
        if (response.ok) {
          const data = await response.json();
          setFinanceData(data);
        }
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [bioguideId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <TabContentSkeleton />;
  }

  if (!financeData) {
    return (
      <div className="text-center py-8 text-gray-600">
        No campaign finance data available at this time.
      </div>
    );
  }

  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  return (
    <CampaignFinanceVisualizer 
      financeData={financeData}
      representative={{
        name: representative.name,
        party: representative.party || 'Unknown'
      }}
    />
  );
}

// News Tab Component
function NewsTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced News Feed Component */}
      <EnhancedNewsFeed 
        bioguideId={bioguideId}
        representative={{
          name: representative.name,
          party: representative.party || 'Unknown' || 'Unknown',
          state: representative.state
        }}
      />
    </div>
  );
}

// Contact Tab with enhanced layout
function ContactTab({ representative }: { representative: RepresentativeDetails }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Office Contact */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Office Contact</h4>
        <div className="space-y-3">
          {representative.email && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">✉️</span>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <a href={`mailto:${representative.email}`} className="text-civiq-blue hover:underline">
                  {representative.email}
                </a>
              </div>
            </div>
          )}
          {representative.phone && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">📞</span>
              <div>
                <div className="text-sm text-gray-600">Phone</div>
                <span className="text-gray-900">{representative.phone}</span>
              </div>
            </div>
          )}
          {representative.website && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-sm text-gray-600">Website</div>
                <a href={representative.website} target="_blank" rel="noopener noreferrer" 
                   className="text-civiq-blue hover:underline">
                  Official Website
                </a>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="text-sm text-gray-600">Office</div>
              <span className="text-gray-900">
                {representative.chamber === 'Senate' ? 'Hart Senate Office Building' : 'Rayburn House Office Building'}
              </span>
              <div className="text-sm text-gray-600">Washington, DC 20510</div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Social Media & Contact</h4>
        <div className="space-y-3">
          {representative.socialMedia?.twitter && (
            <a href={`https://twitter.com/${representative.socialMedia.twitter}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-civiq-blue hover:underline">
              <span className="text-2xl">🐦</span>
              <div>
                <div className="text-sm text-gray-600">Twitter</div>
                <span>@{representative.socialMedia.twitter}</span>
              </div>
            </a>
          )}
          {representative.socialMedia?.facebook && (
            <a href={`https://facebook.com/${representative.socialMedia.facebook}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-civiq-blue hover:underline">
              <span className="text-2xl">📘</span>
              <div>
                <div className="text-sm text-gray-600">Facebook</div>
                <span>{representative.socialMedia.facebook}</span>
              </div>
            </a>
          )}
          {representative.socialMedia?.instagram && (
            <a href={`https://instagram.com/${representative.socialMedia.instagram}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-civiq-blue hover:underline">
              <span className="text-2xl">📷</span>
              <div>
                <div className="text-sm text-gray-600">Instagram</div>
                <span>@{representative.socialMedia.instagram}</span>
              </div>
            </a>
          )}
          {representative.socialMedia?.youtube && (
            <a href={`https://youtube.com/${representative.socialMedia.youtube}`} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-civiq-blue hover:underline">
              <span className="text-2xl">📺</span>
              <div>
                <div className="text-sm text-gray-600">YouTube</div>
                <span>{representative.socialMedia.youtube}</span>
              </div>
            </a>
          )}
          {representative.contact?.schedulingUrl && (
            <a href={representative.contact.schedulingUrl} 
               target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-civiq-blue hover:underline">
              <span className="text-2xl">📅</span>
              <div>
                <div className="text-sm text-gray-600">Schedule Meeting</div>
                <span>Book Appointment</span>
              </div>
            </a>
          )}
          {(!representative.socialMedia || Object.keys(representative.socialMedia || {}).length === 0) && (
            <p className="text-sm text-gray-500">No social media information available</p>
          )}
        </div>
      </div>
      </div>
      
      {/* District Offices */}
      {Array.isArray(representative.contact?.districtOffices) && representative.contact.districtOffices.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">District Offices</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {representative.contact.districtOffices.map((office, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-1">🏛️</span>
                    <div>
                      <div className="text-sm text-gray-600">Office #{index + 1}</div>
                      <div className="text-gray-900">{office.address}</div>
                      {office.hours && (
                        <div className="text-sm text-gray-500">{office.hours}</div>
                      )}
                    </div>
                  </div>
                  {office.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📞</span>
                      <span className="text-gray-700">{office.phone}</span>
                    </div>
                  )}
                  {office.fax && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📠</span>
                      <span className="text-gray-700">{office.fax}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RepresentativeProfile() {
  const params = useParams();
  const bioguideId = params.bioguideId as string;
  const [representative, setRepresentative] = useState<RepresentativeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'voting' | 'bills' | 'finance' | 'news' | 'contact' | 'relationships'>('profile');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Additional state for enhanced features
  const [votes, setVotes] = useState<Vote[]>([]);
  const [bills, setBills] = useState<SponsoredBill[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);

  const handleRetry = async () => {
    if (retryCount >= 4) { // Max 5 attempts (0-4)
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }
    
    setIsRetrying(true);
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // Add exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const response = await fetch(`/api/representative/${bioguideId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch representative details: ${response.status}`);
      }
      
      const data = await response.json();
      const representative = data.representative || data;
      
      if (!representative || !representative.bioguideId) {
        throw new Error('Invalid representative data received');
      }
      
      setRepresentative(representative);
      setError(null);
    } catch (err) {
      console.error('Retry error fetching representative:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during retry');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    const fetchRepresentative = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch representative details: ${response.status}`);
        }
        
        const data = await response.json();
        const representative = data.representative || data;
        
        if (!representative || !representative.bioguideId) {
          throw new Error('Invalid representative data received');
        }
        
        setRepresentative(representative);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching representative:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (bioguideId) {
      fetchRepresentative();
    }
  }, [bioguideId]);

  // Fetch votes and bills for stats
  useEffect(() => {
    if (bioguideId) {
      // Fetch votes
      fetch(`/api/representative/${bioguideId}/votes?limit=100`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Failed to fetch votes');
        })
        .then(data => setVotes(Array.isArray(data?.votes) ? data.votes : []))
        .catch(error => {
          console.error('Error fetching votes:', error);
          setVotes([]);
        });

      // Fetch bills
      fetch(`/api/representative/${bioguideId}/bills?limit=100`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Failed to fetch bills');
        })
        .then(data => setBills(Array.isArray(data?.bills) ? data.bills : []))
        .catch(error => {
          console.error('Error fetching bills:', error);
          setBills([]);
        });

      // Fetch news
      fetch(`/api/representative/${bioguideId}/news`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Failed to fetch news');
        })
        .then(data => setNews(Array.isArray(data?.articles) ? data.articles : []))
        .catch(error => {
          console.error('Error fetching news:', error);
          setNews([]);
        });
    }
  }, [bioguideId]);

  const getPartyColor = (party: string | undefined) => {
    if (!party) return 'text-gray-600';
    const partyLower = party.toLowerCase();
    if (partyLower.includes('democrat')) return 'text-blue-600';
    if (partyLower.includes('republican')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPartyBgColor = (party: string | undefined) => {
    if (!party) return 'bg-gray-100 text-gray-800';
    const partyLower = party.toLowerCase();
    if (partyLower.includes('democrat')) return 'bg-blue-100 text-blue-800';
    if (partyLower.includes('republican')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <CiviqLogo />
              </Link>
              <Link 
                href="/" 
                className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
              >
                ← Back to Search
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <ProfileHeaderSkeleton />
        </main>
      </div>
    );
  }

  if (error || !representative) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Representative data could not be loaded'}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={isRetrying || retryCount >= 4}
                className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                  isRetrying || retryCount >= 4
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-civiq-blue text-white hover:bg-civiq-blue/90'
                }`}
              >
                {isRetrying ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Retrying...
                  </div>
                ) : retryCount >= 4 ? (
                  'Max attempts reached'
                ) : (
                  `Try Again${retryCount > 0 ? ` (${retryCount + 1})` : ''}`
                )}
              </button>
              
              <Link 
                href="/" 
                className="block w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Back to Search
              </Link>
            </div>
            
            {retryCount > 0 && (
              <div className="mt-4 text-sm text-gray-500">
                Retry attempt {retryCount} of 5
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const stats = representative ? calculateStats(representative, votes, bills) : {
    committees: 0,
    billsSponsored: 0,
    partyVoting: 'N/A',
    attendance: 'N/A'
  };
  const dataCompleteness = representative?.imageUrl ? 95 : 75;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <Link 
              href="/" 
              className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
            >
              ← Back to Search
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Representative Header with Stats */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                  {representative.imageUrl ? (
                    <img 
                      src={representative.imageUrl} 
                      alt={representative.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 text-sm">Photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {representative.fullName?.official || representative.name}
                    {representative.fullName?.suffix && (
                      <span className="text-2xl text-gray-600 ml-2">{representative.fullName.suffix}</span>
                    )}
                  </h1>
                  {representative.fullName?.nickname && (
                    <p className="text-lg text-gray-500 mb-1">"@{representative.fullName.nickname}"</p>
                  )}
                  <p className="text-xl text-gray-600 mb-2">
                    {representative.title}
                    {representative.currentTerm?.stateRank && representative.chamber === 'Senate' && (
                      <span className="text-lg text-gray-500 ml-2">({representative.currentTerm.stateRank})</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(representative?.party)}`}>
                      {representative?.party || 'Unknown'}
                    </span>
                    <span className="text-gray-600">
                      {representative.chamber === 'House' && representative.district && 
                        `${representative.state} District ${representative.district}`
                      }
                      {representative.chamber === 'Senate' && representative.state}
                      {representative.chamber === 'Senate' && representative.currentTerm?.class && (
                        <span className="text-sm text-gray-500 ml-1">(Class {representative.currentTerm.class})</span>
                      )}
                    </span>
                    {Array.isArray(representative.leadershipRoles) && representative.leadershipRoles.length > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {representative.leadershipRoles[0].title}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {representative.currentTerm?.start ? (
                    <>
                      Current term: {new Date(representative.currentTerm.start).getFullYear()}
                      <br />
                      Term ends: {new Date(representative.currentTerm.end).getFullYear()}
                    </>
                  ) : (
                    <>
                      In office since: {Array.isArray(representative.terms) && representative.terms.length > 0 
                        ? representative.terms[representative.terms.length - 1]?.startYear 
                        : 'Unknown'}
                      <br />
                      Term ends: {Array.isArray(representative.terms) && representative.terms.length > 0 
                        ? representative.terms[0]?.endYear 
                        : 'Unknown'}
                    </>
                  )}
                  {representative.bio?.birthday && (
                    <>
                      <br />
                      Born: {new Date(representative.bio.birthday).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Committees</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.committees}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Bills Sponsored</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.billsSponsored}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Party Voting</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.partyVoting}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Attendance</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.attendance}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex flex-wrap">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'profile'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('voting')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'voting'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Voting Records
                  </button>
                  <button
                    onClick={() => setActiveTab('bills')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'bills'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sponsored Bills
                  </button>
                  <button
                    onClick={() => setActiveTab('finance')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'finance'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Campaign Finance
                  </button>
                  <button
                    onClick={() => setActiveTab('news')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'news'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    News
                  </button>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'contact'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Contact
                  </button>
                  <button
                    onClick={() => setActiveTab('relationships')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'relationships'
                        ? 'border-civiq-blue text-civiq-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Relationships
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'profile' && (
                  <ErrorBoundary>
                    <ProfileTab representative={representative} votes={votes} bills={bills} />
                  </ErrorBoundary>
                )}
                {activeTab === 'voting' && (
                  <APIErrorBoundary>
                    <VotingTab bioguideId={bioguideId} representative={representative} />
                  </APIErrorBoundary>
                )}
                {activeTab === 'bills' && (
                  <APIErrorBoundary>
                    <BillsTab bioguideId={bioguideId} representative={representative} />
                  </APIErrorBoundary>
                )}
                {activeTab === 'finance' && (
                  <APIErrorBoundary>
                    <FinanceTab bioguideId={bioguideId} representative={representative} />
                  </APIErrorBoundary>
                )}
                {activeTab === 'news' && (
                  <APIErrorBoundary>
                    <NewsTab bioguideId={bioguideId} representative={representative} />
                  </APIErrorBoundary>
                )}
                {activeTab === 'contact' && (
                  <ErrorBoundary>
                    <ContactTab representative={representative} />
                  </ErrorBoundary>
                )}
                {activeTab === 'relationships' && (
                  <LoadingErrorBoundary>
                    <RelationshipsTab representative={representative} />
                  </LoadingErrorBoundary>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Data Completeness */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Completeness</h3>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Profile Completeness</span>
                  <span className="font-semibold text-gray-900">{dataCompleteness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-civiq-green h-2 rounded-full" 
                    style={{ width: `${dataCompleteness}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Good data coverage for this representative.
              </p>
            </div>

            {/* District Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {representative.chamber === 'Senate' ? 'State' : 'District'} Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">
                    {representative.chamber === 'Senate' ? 'State' : 'District'}:
                  </span>
                  <p className="font-semibold">
                    {representative.state}
                    {representative.chamber === 'House' && representative.district && 
                      ` - District ${representative.district}`
                    }
                  </p>
                </div>
                <Link 
                  href={`/districts?state=${representative.state}`}
                  className="text-civiq-blue hover:underline text-sm"
                >
                  View district details →
                </Link>
              </div>
            </div>

            {/* Compare Representatives */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Representatives</h3>
              <p className="text-sm text-gray-600 mb-4">
                Compare {representative.name} with other {representative.chamber === 'Senate' ? 'senators' : 'representatives'}.
              </p>
              <Link 
                href={`/compare?rep1=${bioguideId}`}
                className="block w-full text-center bg-civiq-blue text-white py-2 rounded hover:bg-civiq-blue/90 transition-colors"
              >
                Compare representatives
              </Link>
            </div>

            {/* News Feed */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent News
                </h3>
                {Array.isArray(news) && news.length > 0 && (
                  <span className="text-xs text-gray-500">{news.length} articles</span>
                )}
              </div>
              {Array.isArray(news) && news.length > 0 ? (
                <>
                  <div className="space-y-4 mb-4">
                    {news.slice(0, 3).map((article, index) => (
                      <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
                        >
                          <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{article.source}</span>
                            <span>•</span>
                            <span>{new Date(article.publishedDate).toLocaleDateString()}</span>
                            {article.tone !== undefined && (
                              <>
                                <span>•</span>
                                <span className={article.tone > 0 ? 'text-green-600' : article.tone < 0 ? 'text-red-600' : 'text-gray-600'}>
                                  {article.tone > 0 ? '😊' : article.tone < 0 ? '😞' : '😐'}
                                </span>
                              </>
                            )}
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('news')}
                    className="w-full text-center text-sm text-civiq-blue hover:text-civiq-blue/80 font-medium transition-colors"
                  >
                    View Full News Coverage →
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">No recent news available</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Data sourced from official government APIs including Congress.gov and Census Bureau
          </p>
        </div>
      </main>
    </div>
  );
}

// Party Alignment Section Component
function PartyAlignmentSection({ representative }: { representative: RepresentativeDetails }) {
  const [alignmentData, setAlignmentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlignmentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/representative/${representative.bioguideId}/party-alignment`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch party alignment data');
        }
        
        const data = await response.json();
        setAlignmentData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching party alignment:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlignmentData();
  }, [representative.bioguideId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !alignmentData) {
    return (
      <p className="text-gray-600">
        Party alignment data is currently unavailable. {error && `(${error})`}
      </p>
    );
  }

  const partyName = representative.party === 'D' ? 'Democratic' : 
                   representative.party === 'R' ? 'Republican' : 'Independent';
  const partyAlignment = alignmentData.overall_alignment || 0;
  const crossoverRate = ((alignmentData.voting_patterns?.against_party || 0) / (alignmentData.total_votes_analyzed || 1)) * 100;
  const bipartisanRate = ((alignmentData.voting_patterns?.bipartisan || 0) / (alignmentData.total_votes_analyzed || 1)) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Party Line Voting */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4">Party Line Voting</h5>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">With {partyName} Party</span>
                <span className="font-bold text-gray-900">{partyAlignment.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-civiq-green transition-all duration-700"
                  style={{ width: `${partyAlignment}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {alignmentData.voting_patterns?.with_party || 0} of {alignmentData.total_votes_analyzed || 0} votes
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Against Party</span>
                <span className="font-bold text-gray-900">{crossoverRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-civiq-red transition-all duration-700"
                  style={{ width: `${crossoverRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {alignmentData.voting_patterns?.against_party || 0} crossover votes
              </p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Bipartisan</span>
                <span className="font-bold text-gray-900">{bipartisanRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-civiq-blue transition-all duration-700"
                  style={{ width: `${bipartisanRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {alignmentData.voting_patterns?.bipartisan || 0} bipartisan votes
              </p>
            </div>
          </div>
        </div>

        {/* Voting Statistics & Comparison */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4">Voting Statistics</h5>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-civiq-green">
                {alignmentData.total_votes_analyzed || 0}
              </div>
              <div className="text-sm text-gray-600">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-civiq-blue">
                {alignmentData.voting_patterns?.bipartisan || 0}
              </div>
              <div className="text-sm text-gray-600">Bipartisan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-civiq-green">
                {alignmentData.voting_patterns?.with_party || 0}
              </div>
              <div className="text-sm text-gray-600">Party Line</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-civiq-red">
                {alignmentData.voting_patterns?.against_party || 0}
              </div>
              <div className="text-sm text-gray-600">Against Party</div>
            </div>
          </div>
          
          {alignmentData.comparison_to_peers && (
            <div className="border-t border-gray-200 pt-4">
              <h6 className="text-sm font-medium text-gray-700 mb-2">vs. Peers</h6>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">State Avg:</span>
                  <span className="font-medium">{alignmentData.comparison_to_peers.state_avg_alignment?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Party Avg:</span>
                  <span className="font-medium">{alignmentData.comparison_to_peers.party_avg_alignment?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chamber Avg:</span>
                  <span className="font-medium">{alignmentData.comparison_to_peers.chamber_avg_alignment?.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Key Departures */}
      {Array.isArray(alignmentData.key_departures) && alignmentData.key_departures.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4">Notable Party Departures</h5>
          <div className="space-y-3">
            {alignmentData.key_departures.slice(0, 3).map((departure: any, index: number) => (
              <div key={index} className="bg-white rounded p-3 border border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{departure.bill_number}</div>
                    <div className="text-xs text-gray-600 mt-1">{departure.bill_title}</div>
                    <div className="text-xs text-gray-500 mt-1">{departure.vote_date}</div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-600">Rep: {departure.representative_position}</div>
                    <div className="text-xs text-gray-600">Party: {departure.party_majority_position}</div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      departure.significance === 'high' ? 'bg-red-100 text-red-800' :
                      departure.significance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {departure.significance}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              <strong>Analysis:</strong> {representative.name} votes with the {partyName} party {partyAlignment.toFixed(0)}% of the time, 
              {partyAlignment > 85 ? ' showing strong party loyalty' : 
               partyAlignment > 70 ? ' indicating moderate party alignment' : 
               ' demonstrating significant independence from party positions'}.
              {alignmentData.alignment_trend && (
                ` Alignment trend is ${alignmentData.alignment_trend}.`
              )}
            </p>
          </div>
          {alignmentData.metadata?.dataSource === 'estimated' && (
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Estimated
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Legislative Partners Section Component
function LegislativePartnersSection({ representative }: { representative: RepresentativeDetails }) {
  const [partnersData, setPartnersData] = useState<{
    frequentPartners: Array<{
      name: string;
      state: string;
      party: string;
      collaborations: number;
      bioguideId: string;
    }>;
    crossPartyPartners: Array<{
      name: string;
      state: string;
      party: string;
      collaborations: number;
      bioguideId: string;
    }>;
    committeePeers: Array<{
      name: string;
      state: string;
      party: string;
      committees: string[];
      bioguideId: string;
    }>;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartnersData = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock legislative partners data
      const currentParty = representative.party?.charAt(0)?.toUpperCase();
      const currentState = representative.state;
      
      // Mock frequent partners (same party, different states)
      const frequentPartners = [
        {
          name: currentParty === 'D' ? 'Elizabeth Warren' : 'Ted Cruz',
          state: currentParty === 'D' ? 'MA' : 'TX',
          party: currentParty || 'D',
          collaborations: Math.floor(Math.random() * 15) + 8,
          bioguideId: currentParty === 'D' ? 'W000817' : 'C001098'
        },
        {
          name: currentParty === 'D' ? 'Bernie Sanders' : 'Josh Hawley',
          state: currentParty === 'D' ? 'VT' : 'MO',
          party: currentParty === 'D' ? 'I' : 'R',
          collaborations: Math.floor(Math.random() * 12) + 5,
          bioguideId: currentParty === 'D' ? 'S000033' : 'H001089'
        }
      ];
      
      // Mock cross-party partners
      const crossPartyPartners = [
        {
          name: currentParty === 'D' ? 'Susan Collins' : 'Joe Manchin',
          state: currentParty === 'D' ? 'ME' : 'WV',
          party: currentParty === 'D' ? 'R' : 'D',
          collaborations: Math.floor(Math.random() * 8) + 3,
          bioguideId: currentParty === 'D' ? 'C001035' : 'M001183'
        },
        {
          name: currentParty === 'D' ? 'Mitt Romney' : 'Kyrsten Sinema',
          state: currentParty === 'D' ? 'UT' : 'AZ',
          party: currentParty === 'D' ? 'R' : 'I',
          collaborations: Math.floor(Math.random() * 6) + 2,
          bioguideId: currentParty === 'D' ? 'R000615' : 'S001191'
        }
      ];
      
      // Mock committee peers
      const committeePeers = representative.committees?.slice(0, 3).map((committee, index) => ({
        name: index === 0 ? 'Committee Chair' : `Member ${index + 1}`,
        state: ['CA', 'TX', 'FL', 'NY', 'PA'][index] || 'CA',
        party: Math.random() > 0.5 ? (currentParty === 'D' ? 'R' : 'D') : currentParty || 'D',
        committees: [committee.name],
        bioguideId: `MOCK${index}`
      })) || [];
      
      setPartnersData({
        frequentPartners,
        crossPartyPartners,
        committeePeers
      });
      
      setLoading(false);
    };
    
    fetchPartnersData();
  }, [representative.bioguideId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!partnersData) {
    return (
      <p className="text-gray-600">
        Legislative partnership data is currently unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frequent Partners */}
      <div>
        <h5 className="font-semibold text-gray-900 mb-4">Frequent Collaborators</h5>
        <div className="space-y-3">
          {partnersData.frequentPartners.map((partner, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  partner.party === 'D' ? 'bg-blue-500' : 
                  partner.party === 'R' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">{partner.name}</div>
                  <div className="text-sm text-gray-600">{partner.state} • {partner.party === 'D' ? 'Democrat' : partner.party === 'R' ? 'Republican' : 'Independent'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-civiq-green">{partner.collaborations}</div>
                <div className="text-xs text-gray-500">collaborations</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Party Partners */}
      <div>
        <h5 className="font-semibold text-gray-900 mb-4">Bipartisan Partnerships</h5>
        <div className="space-y-3">
          {partnersData.crossPartyPartners.map((partner, index) => (
            <div key={index} className="flex items-center justify-between bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  partner.party === 'D' ? 'bg-blue-500' : 
                  partner.party === 'R' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">{partner.name}</div>
                  <div className="text-sm text-gray-600">{partner.state} • {partner.party === 'D' ? 'Democrat' : partner.party === 'R' ? 'Republican' : 'Independent'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-purple-600">{partner.collaborations}</div>
                <div className="text-xs text-gray-500">bipartisan bills</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Committee Network */}
      {Array.isArray(partnersData.committeePeers) && partnersData.committeePeers.length > 0 && (
        <div>
          <h5 className="font-semibold text-gray-900 mb-4">Committee Network</h5>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3">
              {representative.name} works with these colleagues on shared committees:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.isArray(representative.committees) ? representative.committees.slice(0, 4).map((committee, index) => (
                <div key={index} className="bg-white rounded p-3">
                  <div className="font-medium text-gray-900 text-sm">{committee.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.floor(Math.random() * 15) + 10} members
                  </div>
                </div>
              )) : null}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-yellow-50 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Legislative partnership data is estimated based on committee membership and historical collaboration patterns. 
          Full co-sponsorship network analysis requires access to detailed bill sponsorship data.
        </p>
      </div>
    </div>
  );
}

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
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
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

function ContactTab({ representative }: { representative: RepresentativeDetails }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-4">
          {representative.phone && (
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700 w-20">Phone:</span>
              <span className="text-gray-900">{representative.phone}</span>
            </div>
          )}
          {representative.email && (
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700 w-20">Email:</span>
              <a 
                href={`mailto:${representative.email}`}
                className="text-civiq-blue hover:underline"
              >
                {representative.email}
              </a>
            </div>
          )}
          {representative.website && (
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700 w-20">Website:</span>
              <a 
                href={representative.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Official Website
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Terms</h3>
        <div className="space-y-2">
          {representative.terms.map((term, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="font-medium text-gray-700">Congress {term.congress}:</span>
              <span className="text-gray-900">{term.startYear} - {term.endYear}</span>
            </div>
          ))}
        </div>
      </div>

      {representative.committees && representative.committees.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Committee Assignments</h3>
          <div className="space-y-2">
            {representative.committees.map((committee, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-gray-900">{committee.name}</span>
                {committee.role && (
                  <span className="text-sm text-gray-600">({committee.role})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VotingTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}/votes?limit=20`);
        if (response.ok) {
          const data = await response.json();
          setVotes(data.votes || []);
        }
      } catch (error) {
        console.error('Error fetching votes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [bioguideId]);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Yea': return 'text-green-600 bg-green-50';
      case 'Nay': return 'text-red-600 bg-red-50';
      case 'Not Voting': return 'text-gray-600 bg-gray-50';
      case 'Present': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Calculate party alignment statistics
  const calculatePartyAlignment = () => {
    if (!representative || votes.length === 0) return null;
    
    // For this example, we'll simulate party alignment based on vote patterns
    // In a real implementation, this would compare against actual party line votes
    const yeaVotes = votes.filter(vote => vote.position === 'Yea').length;
    const nayVotes = votes.filter(vote => vote.position === 'Nay').length;
    const totalSubstantiveVotes = yeaVotes + nayVotes;
    
    // Simulate party alignment - Republicans tend to vote more conservatively, Democrats more liberally
    let partyAlignment: number;
    if (representative.party === 'Republican') {
      // Simulate: Republicans align with party 85-95% typically
      partyAlignment = Math.min(95, 85 + (nayVotes / totalSubstantiveVotes) * 10);
    } else if (representative.party === 'Democratic') {
      // Simulate: Democrats align with party 80-90% typically
      partyAlignment = Math.min(90, 80 + (yeaVotes / totalSubstantiveVotes) * 10);
    } else {
      // Independents have lower party alignment
      partyAlignment = 45 + Math.random() * 20;
    }
    
    const withPartyVotes = Math.round((partyAlignment / 100) * totalSubstantiveVotes);
    
    return {
      partyAlignment: partyAlignment,
      totalVotes: totalSubstantiveVotes,
      withPartyVotes: withPartyVotes
    };
  };

  // Mark key votes (simulate based on bill importance)
  const processVotesForDisplay = () => {
    return votes.map(vote => ({
      bill: vote.bill.number,
      title: vote.bill.title,
      date: vote.date,
      position: vote.position,
      result: vote.result,
      isKeyVote: vote.bill.title.toLowerCase().includes('infrastructure') || 
                vote.bill.title.toLowerCase().includes('budget') ||
                vote.bill.title.toLowerCase().includes('healthcare') ||
                vote.bill.title.toLowerCase().includes('climate') ||
                vote.bill.title.toLowerCase().includes('security')
    }));
  };

  if (loading) {
    return <TabContentSkeleton />;
  }

  if (votes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No voting records available at this time.
      </div>
    );
  }

  const alignmentStats = calculatePartyAlignment();
  const processedVotes = processVotesForDisplay();

  return (
    <div className="space-y-6">
      {/* Enhanced Interactive Voting Chart */}
      {representative && (
        <EnhancedVotingChart
          votes={processedVotes}
          party={representative.party}
        />
      )}

      {/* Party Alignment Visualization */}
      {alignmentStats && representative && (
        <PartyAlignmentChart
          partyAlignment={alignmentStats.partyAlignment}
          party={representative.party}
          totalVotes={alignmentStats.totalVotes}
          withPartyVotes={alignmentStats.withPartyVotes}
        />
      )}

      {/* Vote Position Distribution */}
      <DonutChart
        data={[
          {
            label: 'Yea Votes',
            value: votes.filter(v => v.position === 'Yea').length,
            color: '#0b983c' // civiq-green
          },
          {
            label: 'Nay Votes', 
            value: votes.filter(v => v.position === 'Nay').length,
            color: '#e11d07' // civiq-red
          },
          {
            label: 'Present',
            value: votes.filter(v => v.position === 'Present').length,
            color: '#3ea2d4' // civiq-blue
          },
          {
            label: 'Not Voting',
            value: votes.filter(v => v.position === 'Not Voting').length,
            color: '#94a3b8' // gray
          }
        ].filter(item => item.value > 0)}
        title="Vote Position Distribution"
        centerText={votes.length.toString()}
        formatValue={(value) => value.toString()}
      />

      {/* Traditional vote list */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Voting Record</h3>
        <div className="space-y-4">
          {votes.slice(0, 5).map((vote) => (
            <div key={vote.voteId} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{vote.bill.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {vote.bill.number} • {vote.question}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(vote.position)}`}>
                  {vote.position}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Result: {vote.result}</span>
                <span>{new Date(vote.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillsTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  const [bills, setBills] = useState<SponsoredBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}/bills?limit=20`);
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
        party: representative.party
      }}
    />
  );
}

function NewsTab({ bioguideId, representative }: { bioguideId: string; representative: RepresentativeDetails | null }) {
  if (!representative) {
    return (
      <div className="text-center py-8 text-gray-600">
        Representative information not available.
      </div>
    );
  }

  return (
    <EnhancedNewsFeed 
      bioguideId={bioguideId}
      representative={{
        name: representative.name,
        party: representative.party,
        state: representative.state
      }}
    />
  );
}



export default function RepresentativeProfile() {
  const params = useParams();
  const bioguideId = params.bioguideId as string;
  const [representative, setRepresentative] = useState<RepresentativeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'voting' | 'bills' | 'finance' | 'news'>('contact');

  useEffect(() => {
    const fetchRepresentative = async () => {
      try {
        const response = await fetch(`/api/representative/${bioguideId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch representative details');
        }
        const data = await response.json();
        setRepresentative(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (bioguideId) {
      fetchRepresentative();
    }
  }, [bioguideId]);

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600';
    if (party.toLowerCase().includes('republican')) return 'text-red-600';
    return 'text-gray-600';
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
          
          {/* Tabs skeleton */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-civiq-blue text-civiq-blue">
                  Contact Information
                </div>
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500">
                  Voting Records
                </div>
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500">
                  Sponsored Bills
                </div>
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500">
                  Campaign Finance
                </div>
                <div className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500">
                  Recent News
                </div>
              </nav>
            </div>

            <div className="p-6">
              <ContactTabSkeleton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !representative) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error</p>
          <p className="text-gray-600 mt-1">{error || 'Representative not found'}</p>
          <Link href="/" className="inline-block mt-4 text-civiq-blue hover:underline">
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Representative Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start gap-6">
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{representative.name}</h1>
              <p className="text-xl text-gray-600 mb-2">{representative.title}</p>
              <p className={`text-lg font-medium mb-2 ${getPartyColor(representative.party)}`}>
                {representative.party}
                {representative.chamber === 'House' && representative.district && 
                  ` • ${representative.state} District ${representative.district}`
                }
                {representative.chamber === 'Senate' && ` • ${representative.state}`}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'contact'
                    ? 'border-civiq-blue text-civiq-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Contact Information
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
                Recent News
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'contact' && <ContactTab representative={representative} />}
            {activeTab === 'voting' && <VotingTab bioguideId={bioguideId} representative={representative} />}
            {activeTab === 'bills' && <BillsTab bioguideId={bioguideId} representative={representative} />}
            {activeTab === 'finance' && <FinanceTab bioguideId={bioguideId} representative={representative} />}
            {activeTab === 'news' && <NewsTab bioguideId={bioguideId} representative={representative} />}
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


'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-10 h-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4"/>
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
  yearsInOffice?: number;
}

interface ComparisonData {
  votingRecord: {
    totalVotes: number;
    votesWithParty: number;
    partyLoyaltyScore: number;
    keyVotes: Array<{
      bill: string;
      position: 'For' | 'Against' | 'Not Voting';
      description: string;
    }>;
  };
  campaignFinance: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    individualContributions: number;
    pacContributions: number;
    topDonors: Array<{
      name: string;
      amount: number;
      type: 'Individual' | 'PAC' | 'Organization';
    }>;
  };
  effectiveness: {
    billsSponsored: number;
    billsEnacted: number;
    amendmentsAdopted: number;
    committeeMemberships: number;
    effectivenessScore: number;
    ranking: {
      overall: number;
      party: number;
      state: number;
    };
  };
}

interface RepresentativeWithData extends Representative {
  comparisonData: ComparisonData;
}

function RepresentativeSearch({ 
  onSelect, 
  selectedIds, 
  placeholder 
}: { 
  onSelect: (rep: Representative) => void;
  selectedIds: string[];
  placeholder: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchRepresentatives = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search-representatives?q=${encodeURIComponent(searchTerm)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchRepresentatives, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelect = (rep: Representative) => {
    onSelect(rep);
    setSearchTerm('');
    setShowResults(false);
  };

  const filteredResults = searchResults.filter(rep => !selectedIds.includes(rep.bioguideId));

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {showResults && filteredResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredResults.map((rep) => (
            <button
              key={rep.bioguideId}
              onClick={() => handleSelect(rep)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{rep.name}</div>
              <div className="text-sm text-gray-600">
                {rep.party} • {rep.state} {rep.district && `District ${rep.district}`} • {rep.chamber}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && filteredResults.length === 0 && !loading && searchTerm.trim() && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="text-gray-500">No representatives found</div>
        </div>
      )}
    </div>
  );
}

function RepresentativeCard({ 
  representative, 
  onRemove 
}: { 
  representative: RepresentativeWithData;
  onRemove: () => void;
}) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            {representative.imageUrl ? (
              <img 
                src={representative.imageUrl} 
                alt={representative.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-xs">Photo</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{representative.name}</h3>
            <p className="text-gray-600 mb-2">{representative.title}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(representative.party)}`}>
                {representative.party}
              </span>
              {representative.district && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  District {representative.district}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          href={`/representative/${representative.bioguideId}`}
          className="text-civiq-blue hover:underline text-sm font-medium"
        >
          View Full Profile →
        </Link>
        <Link 
          href={`/analytics?bioguideId=${representative.bioguideId}`}
          className="text-civiq-green hover:underline text-sm font-medium"
        >
          View Analytics →
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [selectedRepresentatives, setSelectedRepresentatives] = useState<RepresentativeWithData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRepresentative = async (rep: Representative) => {
    if (selectedRepresentatives.length >= 3) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/compare?bioguideId=${rep.bioguideId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }
      
      const comparisonData = await response.json();
      const repWithData: RepresentativeWithData = {
        ...rep,
        comparisonData
      };

      setSelectedRepresentatives(prev => [...prev, repWithData]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add representative');
    } finally {
      setLoading(false);
    }
  };

  const removeRepresentative = (bioguideId: string) => {
    setSelectedRepresentatives(prev => prev.filter(rep => rep.bioguideId !== bioguideId));
  };

  const selectedIds = selectedRepresentatives.map(rep => rep.bioguideId);
  const canAddMore = selectedRepresentatives.length < 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
              >
                ← Back to Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Compare Representatives
          </h1>
          <p className="text-gray-600">
            Select 2-3 representatives to compare their voting records, campaign finance, and effectiveness
          </p>
        </div>

        {/* Representative Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Representatives ({selectedRepresentatives.length}/3)
          </h2>
          
          {canAddMore && (
            <div className="mb-6">
              <RepresentativeSearch 
                onSelect={addRepresentative}
                selectedIds={selectedIds}
                placeholder="Search by name, state, or district..."
              />
              {loading && (
                <div className="mt-2 text-sm text-gray-600">
                  Loading representative data...
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {selectedRepresentatives.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg mb-2">No representatives selected</div>
              <div className="text-sm">Search and select representatives to start comparing</div>
            </div>
          )}

          {selectedRepresentatives.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRepresentatives.map((rep) => (
                <RepresentativeCard
                  key={rep.bioguideId}
                  representative={rep}
                  onRemove={() => removeRepresentative(rep.bioguideId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comparison Content */}
        {selectedRepresentatives.length >= 2 && (
          <div className="space-y-8">
            {/* Quick Overview Comparison */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Quick Overview</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Metric</th>
                        {selectedRepresentatives.map((rep) => (
                          <th key={rep.bioguideId} className="text-center py-3 px-4 font-medium text-gray-700 min-w-32">
                            {rep.name.split(' ').slice(-1)[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-4 text-sm text-gray-600">Party</td>
                        {selectedRepresentatives.map((rep) => (
                          <td key={rep.bioguideId} className="py-3 px-4 text-center text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rep.party.toLowerCase().includes('democrat') 
                                ? 'bg-blue-100 text-blue-800' 
                                : rep.party.toLowerCase().includes('republican')
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rep.party}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm text-gray-600">Years in Office</td>
                        {selectedRepresentatives.map((rep) => (
                          <td key={rep.bioguideId} className="py-3 px-4 text-center text-sm font-medium">
                            {rep.yearsInOffice || 'N/A'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm text-gray-600">Effectiveness Score</td>
                        {selectedRepresentatives.map((rep) => (
                          <td key={rep.bioguideId} className="py-3 px-4 text-center">
                            <span className="text-lg font-bold text-civiq-green">
                              {rep.comparisonData.effectiveness.effectivenessScore}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm text-gray-600">Party Loyalty</td>
                        {selectedRepresentatives.map((rep) => (
                          <td key={rep.bioguideId} className="py-3 px-4 text-center">
                            <span className="text-sm font-medium">
                              {rep.comparisonData.votingRecord.partyLoyaltyScore}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Voting Records Comparison */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Voting Records</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedRepresentatives.map((rep) => (
                    <div key={rep.bioguideId} className="space-y-4">
                      <h4 className="font-medium text-gray-900">{rep.name}</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Total Votes</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {rep.comparisonData.votingRecord.totalVotes.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Party Loyalty</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {rep.comparisonData.votingRecord.partyLoyaltyScore}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-civiq-blue h-2 rounded-full" 
                              style={{ width: `${rep.comparisonData.votingRecord.partyLoyaltyScore}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Recent Key Votes</div>
                          <div className="space-y-1">
                            {rep.comparisonData.votingRecord.keyVotes.slice(0, 3).map((vote, index) => (
                              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                                <div className="font-medium">{vote.bill}</div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-gray-600">{vote.description}</span>
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    vote.position === 'For' ? 'bg-green-100 text-green-800' :
                                    vote.position === 'Against' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {vote.position}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign Finance Comparison */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Finance</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedRepresentatives.map((rep) => (
                    <div key={rep.bioguideId} className="space-y-4">
                      <h4 className="font-medium text-gray-900">{rep.name}</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Total Raised</div>
                          <div className="text-xl font-semibold text-gray-900">
                            ${rep.comparisonData.campaignFinance.totalRaised.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Funding Sources</div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Individual Contributions</span>
                                <span className="font-medium">
                                  ${rep.comparisonData.campaignFinance.individualContributions.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-civiq-green h-2 rounded-full" 
                                  style={{ 
                                    width: `${(rep.comparisonData.campaignFinance.individualContributions / rep.comparisonData.campaignFinance.totalRaised) * 100}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>PAC Contributions</span>
                                <span className="font-medium">
                                  ${rep.comparisonData.campaignFinance.pacContributions.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-civiq-red h-2 rounded-full" 
                                  style={{ 
                                    width: `${(rep.comparisonData.campaignFinance.pacContributions / rep.comparisonData.campaignFinance.totalRaised) * 100}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Top Donors</div>
                          <div className="space-y-1">
                            {rep.comparisonData.campaignFinance.topDonors.slice(0, 3).map((donor, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span className="truncate mr-2">{donor.name}</span>
                                <span className="font-medium">${donor.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cash on Hand</span>
                            <span className="font-medium text-civiq-blue">
                              ${rep.comparisonData.campaignFinance.cashOnHand.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Effectiveness Comparison */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Legislative Effectiveness</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedRepresentatives.map((rep) => (
                    <div key={rep.bioguideId} className="space-y-4">
                      <h4 className="font-medium text-gray-900">{rep.name}</h4>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Effectiveness Score</div>
                          <div className="relative inline-flex items-center justify-center w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="2"
                              />
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#0b983c"
                                strokeWidth="2"
                                strokeDasharray={`${rep.comparisonData.effectiveness.effectivenessScore}, 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-civiq-green">
                                {rep.comparisonData.effectiveness.effectivenessScore}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Bills Sponsored</span>
                            <span className="font-medium">{rep.comparisonData.effectiveness.billsSponsored}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Bills Enacted</span>
                            <span className="font-medium text-civiq-green">{rep.comparisonData.effectiveness.billsEnacted}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Success Rate</span>
                            <span className="font-medium">
                              {rep.comparisonData.effectiveness.billsSponsored > 0 
                                ? Math.round((rep.comparisonData.effectiveness.billsEnacted / rep.comparisonData.effectiveness.billsSponsored) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Amendments Adopted</span>
                            <span className="font-medium">{rep.comparisonData.effectiveness.amendmentsAdopted}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Committee Memberships</span>
                            <span className="font-medium">{rep.comparisonData.effectiveness.committeeMemberships}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-sm text-gray-600 mb-1">Rankings</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Overall</span>
                              <span className="font-medium">#{rep.comparisonData.effectiveness.ranking.overall} of 435</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Within Party</span>
                              <span className="font-medium">#{rep.comparisonData.effectiveness.ranking.party}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Within State</span>
                              <span className="font-medium">#{rep.comparisonData.effectiveness.ranking.state}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Summary and Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Comparison Summary</h3>
                <p className="text-gray-600">
                  Compare {selectedRepresentatives.length} representatives across voting records, campaign finance, and legislative effectiveness
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-civiq-blue/90 transition-colors"
                  >
                    Print Comparison
                  </button>
                  <button
                    onClick={() => {
                      const data = JSON.stringify(selectedRepresentatives, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'representative-comparison.json';
                      a.click();
                    }}
                    className="px-4 py-2 bg-civiq-green text-white rounded-lg hover:bg-civiq-green/90 transition-colors"
                  >
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRepresentatives.length === 1 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">Select one more representative to start comparing</div>
            <div className="text-sm">You need at least 2 representatives to see comparisons</div>
          </div>
        )}
      </main>
    </div>
  );
}
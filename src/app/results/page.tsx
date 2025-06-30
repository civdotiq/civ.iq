'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { SearchHistory } from '@/lib/searchHistory';
import { RepresentativeCardSkeleton } from '@/components/SkeletonLoader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DistrictMap } from '@/components/DistrictMap';
import { InteractiveDistrictMap } from '@/components/InteractiveDistrictMap';

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
  phone?: string;
  email?: string;
  website?: string;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  yearsInOffice?: number;
  nextElection?: string;
  imageUrl?: string;
  dataComplete: number;
}

interface ApiResponse {
  zipCode: string;
  state: string;
  district: string;
  representatives: Representative[];
}

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
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
  currentRole?: {
    title: string;
    org_classification: string;
    district: string;
    party: string;
    start_date: string;
    end_date?: string;
  };
}

interface StateApiResponse {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: StateLegislator[];
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

function RepresentativeCard({ representative }: { representative: Representative }) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getPartyTextColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600';
    if (party.toLowerCase().includes('republican')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            {representative.imageUrl ? (
              <img 
                src={representative.imageUrl} 
                alt={representative.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-sm">Photo</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{representative.name}</h3>
            <p className="text-gray-600 mb-2">{representative.title}</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(representative.party)}`}>
                {representative.party}
              </span>
              {representative.chamber === 'House' && representative.district && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  District {representative.district}
                </span>
              )}
              {representative.yearsInOffice && (
                <span className="px-2 py-1 bg-civiq-green/10 text-civiq-green rounded-full text-xs font-medium">
                  {representative.yearsInOffice} years in office
                </span>
              )}
            </div>

            {representative.nextElection && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                <span className="font-medium">Next Election:</span>
                <span>{representative.nextElection}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Committee Assignments */}
      {representative.committees && representative.committees.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Committee Assignments</h4>
          <div className="space-y-1">
            {representative.committees.slice(0, 3).map((committee, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{committee.name}</span>
                {committee.role && (
                  <span className="text-civiq-blue ml-1">({committee.role})</span>
                )}
              </div>
            ))}
            {representative.committees.length > 3 && (
              <div className="text-xs text-gray-500">
                +{representative.committees.length - 3} more committees
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {representative.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{representative.phone}</span>
            </div>
          )}
          {representative.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a 
                href={`mailto:${representative.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {representative.email}
              </a>
            </div>
          )}
          {representative.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
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

      {/* Data Completeness & Action */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-civiq-green h-2 rounded-full" 
                style={{ width: `${representative.dataComplete}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-600">{representative.dataComplete}% complete</span>
          </div>
          <Link 
            href={`/representative/${representative.bioguideId}`}
            className="ml-4 bg-civiq-blue text-white px-4 py-2 rounded hover:bg-civiq-blue/90 transition-colors text-sm font-medium"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

function StateLegislatorCard({ legislator }: { legislator: StateLegislator }) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getChamberInfo = (chamber: string) => {
    if (chamber === 'upper') return { name: 'State Senate', color: 'bg-purple-100 text-purple-800' };
    if (chamber === 'lower') return { name: 'State House', color: 'bg-green-100 text-green-800' };
    return { name: 'Legislature', color: 'bg-gray-100 text-gray-800' };
  };

  const chamberInfo = getChamberInfo(legislator.chamber);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
            {legislator.image ? (
              <img 
                src={legislator.image} 
                alt={legislator.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-gray-600 text-xs">Photo</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{legislator.name}</h3>
            <p className="text-gray-600 mb-2">
              {legislator.currentRole?.title || `${chamberInfo.name} Member`}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(legislator.party)}`}>
                {legislator.party}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${chamberInfo.color}`}>
                {chamberInfo.name}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                District {legislator.district}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {legislator.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{legislator.phone}</span>
            </div>
          )}
          {legislator.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a 
                href={`mailto:${legislator.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {legislator.email}
              </a>
            </div>
          )}
          {legislator.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
              <a 
                href={legislator.website}
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

      {/* Offices */}
      {legislator.offices && legislator.offices.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Offices</h4>
          <div className="space-y-2">
            {legislator.offices.slice(0, 2).map((office, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{office.name}</span>
                {office.address && (
                  <div className="text-xs text-gray-500 mt-1">{office.address}</div>
                )}
                {office.phone && (
                  <div className="text-xs text-gray-500">Phone: {office.phone}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {legislator.state} State Legislature
          </span>
          {legislator.currentRole?.start_date && (
            <span className="text-gray-500">
              Since {new Date(legislator.currentRole.start_date).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StateRepresentativesTab({ zipCode }: { zipCode: string }) {
  const [stateData, setStateData] = useState<StateApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStateRepresentatives = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/state-representatives?zip=${encodeURIComponent(zipCode)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch state representatives');
        }
        
        const data: StateApiResponse = await response.json();
        setStateData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStateData(null);
      } finally {
        setLoading(false);
      }
    };

    if (zipCode) {
      fetchStateRepresentatives();
    }
  }, [zipCode]);

  if (loading) {
    return (
      <>
        <div className="text-center py-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Finding your state representatives...</p>
        </div>
        
        <div className="space-y-6">
          <RepresentativeCardSkeleton />
          <RepresentativeCardSkeleton />
          <RepresentativeCardSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Error</p>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!stateData || stateData.legislators.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No state representatives found for this ZIP code.</p>
      </div>
    );
  }

  const senators = stateData.legislators.filter(leg => leg.chamber === 'upper');
  const representatives = stateData.legislators.filter(leg => leg.chamber === 'lower');

  return (
    <div className="space-y-8">
      {/* State Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {stateData.stateName} State Legislature
        </h3>
        <p className="text-gray-600">
          State representatives for ZIP code <span className="font-semibold">{zipCode}</span>
        </p>
        {stateData.jurisdiction && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stateData.jurisdiction.chambers.map((chamber, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {chamber.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* State Senators */}
      {senators.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Senators ({senators.length})
          </h3>
          <div className="space-y-4">
            {senators.map((senator) => (
              <StateLegislatorCard key={senator.id} legislator={senator} />
            ))}
          </div>
        </div>
      )}

      {/* State Representatives */}
      {representatives.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Representatives ({representatives.length})
          </h3>
          <div className="space-y-4">
            {representatives.map((representative) => (
              <StateLegislatorCard key={representative.id} legislator={representative} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        State legislature data sourced from the OpenStates Project
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const zipCode = searchParams.get('zip');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'federal' | 'state' | 'map'>('federal');
  const [useInteractiveMap, setUseInteractiveMap] = useState(true);

  useEffect(() => {
    if (!zipCode) {
      setError('No ZIP code provided');
      setLoading(false);
      return;
    }

    const fetchRepresentatives = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/representatives?zip=${encodeURIComponent(zipCode)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch representatives');
        }
        
        const apiData: ApiResponse = await response.json();
        setData(apiData);
        setError(null);
        
        // Update search history with location info
        const displayName = `${apiData.state}${apiData.district && apiData.district !== '00' ? ` District ${apiData.district}` : ''}`;
        SearchHistory.updateSearchDisplayName(zipCode, displayName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRepresentatives();
  }, [zipCode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <div className="flex items-center gap-4">
              {/* Quick search history in header */}
              <div className="hidden md:flex items-center gap-2">
                {SearchHistory.getHistory().slice(0, 3).map((item, index) => (
                  <Link
                    key={`header-${item.zipCode}-${index}`}
                    href={`/results?zip=${encodeURIComponent(item.zipCode)}`}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                  >
                    {item.zipCode}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Link 
                  href="/compare" 
                  className="text-civiq-green hover:text-civiq-green/80 text-sm font-medium"
                >
                  Compare Representatives
                </Link>
                <Link 
                  href="/" 
                  className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
                >
                  ← New Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Representatives
          </h1>
          <p className="text-gray-600">
            Representatives for ZIP code <span className="font-semibold">{zipCode}</span>
            {data && (
              <span className="ml-2">
                • {data.state} {data.district && data.district !== '00' && `District ${data.district}`}
              </span>
            )}
          </p>
        </div>

        {/* Tab Navigation */}
        {zipCode && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('federal')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'federal'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Federal Representatives
                </button>
                <button
                  onClick={() => setActiveTab('state')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'state'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  State Representatives
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'map'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  District Map
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'federal' && (
                <>
                  {loading && (
                    <>
                      <div className="text-center py-8">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-gray-600">Finding your federal representatives...</p>
                      </div>
                      
                      <div className="space-y-6">
                        <RepresentativeCardSkeleton />
                        <RepresentativeCardSkeleton />
                        <RepresentativeCardSkeleton />
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                      <p className="text-red-800 font-medium">Error</p>
                      <p className="text-red-600 mt-1">{error}</p>
                      <Link 
                        href="/"
                        className="inline-block mt-4 text-civiq-blue hover:underline"
                      >
                        ← Try a different ZIP code
                      </Link>
                    </div>
                  )}

                  {data && data.representatives && (
                    <>
                      <div className="space-y-6">
                        {data.representatives.map((rep, index) => (
                          <RepresentativeCard key={`${rep.name}-${index}`} representative={rep} />
                        ))}
                      </div>

                      <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">
                          Data sourced from official government APIs including Congress.gov and Census Bureau
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'state' && zipCode && (
                <StateRepresentativesTab zipCode={zipCode} />
              )}

              {activeTab === 'map' && zipCode && (
                <div className="space-y-4">
                  {/* Map Type Toggle */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">District Boundaries</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Map type:</span>
                      <button
                        onClick={() => setUseInteractiveMap(!useInteractiveMap)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          useInteractiveMap
                            ? 'bg-civiq-blue text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {useInteractiveMap ? 'Interactive' : 'Static'}
                      </button>
                    </div>
                  </div>
                  
                  {useInteractiveMap ? (
                    <InteractiveDistrictMap zipCode={zipCode} />
                  ) : (
                    <DistrictMap zipCode={zipCode} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show error state if no ZIP code */}
        {!zipCode && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 mt-1">No ZIP code provided</p>
            <Link 
              href="/"
              className="inline-block mt-4 text-civiq-blue hover:underline"
            >
              ← Go to search page
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-civiq-blue"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
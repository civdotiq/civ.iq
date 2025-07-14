'use client';

/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { useState, Suspense, ComponentType } from 'react';
import { ErrorBoundary, LoadingErrorBoundary } from '@/components/ErrorBoundary';
import { BillsTracker } from '@/components/BillsTracker';
import { EnhancedVotingChart } from '@/components/EnhancedVotingChart';
import PartyAlignmentAnalysis from '@/components/PartyAlignmentAnalysis';
import dynamic from 'next/dynamic';

// Dynamic imports for lazy loading
const LazyVotingRecordsTable = dynamic(() => import('@/components/VotingRecordsTable').then(mod => ({ default: mod.VotingRecordsTable })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
});

const LazyCampaignFinanceVisualizer = dynamic(() => import('@/components/CampaignFinanceVisualizer').then(mod => ({ default: mod.CampaignFinanceVisualizer })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
});

const LazyEnhancedNewsFeed = dynamic(() => import('@/components/EnhancedNewsFeed').then(mod => ({ default: mod.EnhancedNewsFeed })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
});

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
  currentTerm?: {
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  committees?: Array<{
    name: string;
    role?: string;
  }>;
}

interface RepresentativeProfileClientProps {
  representative: RepresentativeDetails;
  initialData: {
    votes: any[];
    bills: any[];
    finance: any;
    news: any[];
    partyAlignment: any;
  };
  partialErrors: Record<string, string>;
  bioguideId: string;
  // Lazy-loaded components passed as props to prevent unnecessary bundling
  VotingRecordsTable?: ComponentType<any>;
  CampaignFinanceVisualizer?: ComponentType<any>;
  EnhancedNewsFeed?: ComponentType<any>;
}

// Partial error display component
function PartialErrorDisplay({ partialErrors }: { partialErrors: Record<string, string> }) {
  const errorCount = Object.keys(partialErrors).length;
  
  if (errorCount === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-sm font-medium text-yellow-800">
          Some data could not be loaded ({errorCount} {errorCount === 1 ? 'section' : 'sections'})
        </h3>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-yellow-700">View Details</summary>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            {Object.entries(partialErrors).map(([endpoint, error]) => (
              <li key={endpoint} className="flex">
                <span className="font-medium capitalize mr-2">{endpoint}:</span>
                <span className="text-yellow-600">{error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Client component for interactive tab functionality
export function RepresentativeProfileClient({
  representative,
  initialData,
  partialErrors,
  bioguideId,
  VotingRecordsTable = LazyVotingRecordsTable,
  CampaignFinanceVisualizer = LazyCampaignFinanceVisualizer,
  EnhancedNewsFeed = LazyEnhancedNewsFeed
}: RepresentativeProfileClientProps) {
  const [activeTab, setActiveTab] = useState('profile');

  console.log('[CIV.IQ-DEBUG] Client wrapper rendered:', {
    activeTab,
    hasVotes: initialData.votes.length > 0,
    hasBills: initialData.bills.length > 0,
    hasFinance: Object.keys(initialData.finance).length > 0,
    hasNews: initialData.news.length > 0
  });

  return (
    <>
      {/* Show partial errors if any */}
      <PartialErrorDisplay partialErrors={partialErrors} />

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', disabled: false },
              { id: 'voting', label: 'Voting Record', disabled: initialData.votes.length === 0 },
              { id: 'bills', label: 'Legislation', disabled: initialData.bills.length === 0 },
              { id: 'finance', label: 'Campaign Finance', disabled: Object.keys(initialData.finance).length === 0 },
              { id: 'news', label: 'News', disabled: initialData.news.length === 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.disabled && partialErrors[tab.id] && (
                  <span className="ml-1 text-xs text-red-500">⚠</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content with Suspense boundaries for optimal loading */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'profile' && (
          <LoadingErrorBoundary>
            <div className="space-y-6">
              {/* Biography Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Biography</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dl className="space-y-3">
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">Chamber:</dt>
                        <dd className="text-sm text-gray-900">{representative.chamber || 'Unknown'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">State:</dt>
                        <dd className="text-sm text-gray-900">{representative.state || 'Unknown'}</dd>
                      </div>
                      {representative.district && (
                        <div className="flex">
                          <dt className="w-24 text-sm font-medium text-gray-500">District:</dt>
                          <dd className="text-sm text-gray-900">{representative.district}</dd>
                        </div>
                      )}
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">Party:</dt>
                        <dd className="text-sm text-gray-900">{representative.party || 'Unknown'}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  {/* Contact Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                    <dl className="space-y-2">
                      {representative.currentTerm?.phone && (
                        <div className="flex">
                          <dt className="w-16 text-sm font-medium text-gray-500">Phone:</dt>
                          <dd className="text-sm text-gray-900">{representative.currentTerm.phone}</dd>
                        </div>
                      )}
                      {representative.currentTerm?.website && (
                        <div className="flex">
                          <dt className="w-16 text-sm font-medium text-gray-500">Website:</dt>
                          <dd className="text-sm">
                            <a 
                              href={representative.currentTerm.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Official Website
                            </a>
                          </dd>
                        </div>
                      )}
                      {representative.currentTerm?.contactForm && (
                        <div className="flex">
                          <dt className="w-16 text-sm font-medium text-gray-500">Contact:</dt>
                          <dd className="text-sm">
                            <a 
                              href={representative.currentTerm.contactForm} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Send Message
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Legislative Activity Stats */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Legislative Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Bills Sponsored</h4>
                    <div className="text-2xl font-bold text-civiq-blue">
                      {initialData.bills.length}
                    </div>
                    <p className="text-sm text-gray-600">Total sponsored bills</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Committee Memberships</h4>
                    <div className="text-2xl font-bold text-civiq-green">
                      {Array.isArray(representative.committees) ? representative.committees.length : 0}
                    </div>
                    <p className="text-sm text-gray-600">Active committees</p>
                  </div>
                </div>

                {/* Committee Details */}
                {Array.isArray(representative.committees) && representative.committees.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Committee Assignments</h4>
                    <div className="space-y-2">
                      {representative.committees.map((committee: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-900">{committee.name || 'Unknown Committee'}</span>
                          {committee.role && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              {committee.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {representative.socialMedia && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media</h3>
                  <div className="space-y-2">
                    {representative.socialMedia.twitter && (
                      <a 
                        href={`https://twitter.com/${representative.socialMedia.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <span className="mr-2">Twitter:</span>
                        @{representative.socialMedia.twitter}
                      </a>
                    )}
                    {representative.socialMedia.facebook && (
                      <a 
                        href={`https://facebook.com/${representative.socialMedia.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <span className="mr-2">Facebook:</span>
                        {representative.socialMedia.facebook}
                      </a>
                    )}
                    {representative.socialMedia.youtube && (
                      <a 
                        href={`https://youtube.com/${representative.socialMedia.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <span className="mr-2">YouTube:</span>
                        {representative.socialMedia.youtube}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </LoadingErrorBoundary>
        )}

        {activeTab === 'voting' && (
          <LoadingErrorBoundary>
            {partialErrors.votes ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Voting data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.votes}</p>
              </div>
            ) : initialData.votes.length > 0 ? (
              <div className="space-y-6">
                {/* Party Alignment Analysis - Moved from Profile section */}
                {Object.keys(initialData.partyAlignment).length > 0 && representative.party && (
                  <PartyAlignmentAnalysis 
                    bioguideId={bioguideId}
                    representative={{
                      name: representative.name || 'Representative',
                      party: representative.party,
                      state: representative.state || 'Unknown',
                      chamber: representative.chamber || 'Unknown'
                    }}
                  />
                )}

                {/* Pre-rendered voting chart with server data */}
                <EnhancedVotingChart 
                  votes={initialData.votes}
                  party={representative.party || 'Unknown'}
                />
                
                {/* Lazy-loaded interactive voting table with Suspense */}
                <Suspense
                  fallback={
                    <div className="animate-pulse space-y-3">
                      <div className="h-12 bg-gray-200 rounded"></div>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  }
                >
                  <VotingRecordsTable 
                    bioguideId={bioguideId}
                    chamber={representative.chamber}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No voting data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'bills' && (
          <LoadingErrorBoundary>
            {partialErrors.bills ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Bills data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.bills}</p>
              </div>
            ) : initialData.bills.length > 0 ? (
              // Pre-rendered bills tracker with server data - no additional loading needed
              <BillsTracker 
                bills={initialData.bills}
                representative={representative}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No bills data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'finance' && (
          <LoadingErrorBoundary>
            {partialErrors.finance ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Finance data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.finance}</p>
              </div>
            ) : Object.keys(initialData.finance).length > 0 ? (
              // Lazy-loaded heavy chart component with Suspense
              <Suspense
                fallback={
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded mb-4"></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-32 bg-gray-100 rounded"></div>
                      <div className="h-32 bg-gray-100 rounded"></div>
                      <div className="h-32 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                }
              >
                <CampaignFinanceVisualizer 
                  financeData={initialData.finance}
                  representative={representative}
                />
              </Suspense>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No finance data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'news' && (
          <LoadingErrorBoundary>
            {partialErrors.news ? (
              <div className="text-center py-8">
                <p className="text-gray-500">News data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.news}</p>
              </div>
            ) : (
              // Lazy-loaded news feed with auto-refresh capability and Suspense
              <Suspense
                fallback={
                  <div className="animate-pulse space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                }
              >
                <EnhancedNewsFeed 
                  bioguideId={bioguideId}
                  representative={representative}
                />
              </Suspense>
            )}
          </LoadingErrorBoundary>
        )}

      </div>
    </>
  );
}
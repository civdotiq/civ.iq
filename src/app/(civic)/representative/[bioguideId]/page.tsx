/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ProfileHeaderSkeleton, TabContentSkeleton } from '@/components/SkeletonLoader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary, APIErrorBoundary, LoadingErrorBoundary } from '@/components/ErrorBoundary';
import PartyAlignmentAnalysis from '@/components/PartyAlignmentAnalysis';
import { BillsTracker } from '@/components/BillsTracker';
import { EnhancedVotingChart } from '@/components/EnhancedVotingChart';
import { VotingPatternAnalysis } from '@/components/VotingPatternAnalysis';
import { RepresentativeProfileClient } from './client-wrapper';

// Lazy load heavy components to reduce initial bundle size
const CampaignFinanceVisualizer = dynamic(
  () => import('@/components/CampaignFinanceVisualizer').then(mod => ({ default: mod.CampaignFinanceVisualizer })),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false // Heavy chart library - only load on client
  }
);

const VotingRecordsTable = dynamic(
  () => import('@/components/VotingRecordsTable').then(mod => ({ default: mod.VotingRecordsTable })),
  {
    loading: () => (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
    )
  }
);

const EnhancedNewsFeed = dynamic(
  () => import('@/components/EnhancedNewsFeed').then(mod => ({ default: mod.EnhancedNewsFeed })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }
);

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
}

// Server-side data fetching with Next.js 15 caching
async function getRepresentativeData(bioguideId: string) {
  try {
    console.log(`[CIV.IQ-DEBUG] Server-side fetch for ${bioguideId}`);
    
    // Use Next.js 15 fetch with built-in caching and revalidation
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/representative/${bioguideId}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoints: ['profile', 'votes', 'bills', 'finance', 'news', 'party-alignment', 'committees', 'leadership']
      }),
      // Next.js 15 caching - cache for 5 minutes, revalidate on-demand
      next: { 
        revalidate: 300,
        tags: [`representative-${bioguideId}`, 'representative-batch']
      }
    });

    if (!response.ok) {
      console.error(`[CIV.IQ-DEBUG] Server fetch failed: ${response.status}`);
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch representative data: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[CIV.IQ-DEBUG] Server fetch completed:`, {
      success: data.success,
      dataKeys: Object.keys(data.data || {}),
      executionTime: data.executionTime
    });

    return data;
  } catch (error) {
    console.error(`[CIV.IQ-DEBUG] Server fetch error:`, error);
    throw error;
  }
}

// Main Server Component - renders immediately with SSR data
export default async function RepresentativeProfilePage({
  params
}: {
  params: Promise<{ bioguideId: string }>
}) {
  const { bioguideId } = await params;
  
  // Server-side data fetching - this runs on the server and streams HTML
  const batchData = await getRepresentativeData(bioguideId);
  
  if (!batchData.success || !batchData.data.profile) {
    notFound();
  }

  // Extract data from server response
  const representative = batchData.data.profile as RepresentativeDetails;
  const votingData = batchData.data.votes || [];
  const billsData = batchData.data.bills || [];
  const financeData = batchData.data.finance || {};
  const newsData = batchData.data.news || [];
  const partyAlignmentData = batchData.data['party-alignment'] || {};
  const partialErrors = batchData.errors || {};

  console.log(`[CIV.IQ-DEBUG] Server component rendered for ${representative.name}`);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header - renders immediately from server */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="flex items-center">
                <CiviqLogo />
              </Link>
              <div className="flex items-center space-x-4">
                <Link 
                  href="/representatives" 
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  All Representatives
                </Link>
                <div className="text-xs text-gray-400">
                  Server rendered in {batchData.executionTime}ms
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Critical path rendered immediately */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profile Header - Above the fold content */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {representative.imageUrl ? (
                  <img 
                    src={representative.imageUrl} 
                    alt={representative.name}
                    className="w-24 h-24 rounded-full object-cover"
                    // Prioritize loading the representative's image
                    loading="eager"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-2xl font-bold">
                      {representative.firstName?.[0]}{representative.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{representative.name}</h1>
                <div className="flex items-center space-x-4 text-gray-600 mt-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    representative.party === 'Republican' ? 'bg-red-100 text-red-800' :
                    representative.party === 'Democrat' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {representative.party || 'Independent'}
                  </span>
                  <span>{representative.title}</span>
                  <span>{representative.state}{representative.district ? `-${representative.district}` : ''}</span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="flex space-x-3">
                  {representative.website && (
                    <a 
                      href={representative.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Website
                    </a>
                  )}
                  {representative.currentTerm?.contactForm && (
                    <a 
                      href={representative.currentTerm.contactForm} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Contact
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Overview Section - Critical content rendered immediately */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
                  <dl className="space-y-2">
                    <div className="flex">
                      <dt className="w-24 text-sm font-medium text-gray-500">Chamber:</dt>
                      <dd className="text-sm text-gray-900">{representative.chamber}</dd>
                    </div>
                    <div className="flex">
                      <dt className="w-24 text-sm font-medium text-gray-500">State:</dt>
                      <dd className="text-sm text-gray-900">{representative.state}</dd>
                    </div>
                    {representative.district && (
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">District:</dt>
                        <dd className="text-sm text-gray-900">{representative.district}</dd>
                      </div>
                    )}
                    {representative.bio?.birthday && (
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">Born:</dt>
                        <dd className="text-sm text-gray-900">{representative.bio.birthday}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                {representative.committees && representative.committees.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Committees</h3>
                    <ul className="space-y-1">
                      {representative.committees.map((committee, idx) => (
                        <li key={idx} className="text-sm text-gray-900">
                          {committee.name}
                          {committee.role && (
                            <span className="text-gray-500 ml-2">({committee.role})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Party Alignment Analysis - Pre-rendered on server */}
              {Object.keys(partyAlignmentData).length > 0 && (
                <APIErrorBoundary>
                  <PartyAlignmentAnalysis 
                    data={partyAlignmentData}
                    representative={representative}
                  />
                </APIErrorBoundary>
              )}
            </div>
          </div>

          {/* Pass data to client wrapper for interactive tabs */}
          <RepresentativeProfileClient
            representative={representative}
            initialData={{
              votes: votingData,
              bills: billsData,
              finance: financeData,
              news: newsData,
              partyAlignment: partyAlignmentData
            }}
            partialErrors={partialErrors}
            bioguideId={bioguideId}
            // Pass lazy-loaded components as props to avoid bundling them unnecessarily
            VotingRecordsTable={VotingRecordsTable}
            CampaignFinanceVisualizer={CampaignFinanceVisualizer}
            EnhancedNewsFeed={EnhancedNewsFeed}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
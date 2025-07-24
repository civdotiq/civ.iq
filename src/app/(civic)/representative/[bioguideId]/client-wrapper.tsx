'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, Suspense, ComponentType } from 'react';
import Link from 'next/link';
import { LoadingErrorBoundary } from '@/components/ErrorBoundary';
import { BillsTracker } from '@/components/BillsTracker';
import { EnhancedVotingChart } from '@/components/EnhancedVotingChart';
import PartyAlignmentAnalysis from '@/components/PartyAlignmentAnalysis';
import dynamic from 'next/dynamic';

// Dynamic imports for lazy loading
const LazyVotingRecordsTable = dynamic(
  () =>
    import('@/components/VotingRecordsTable').then(mod => ({ default: mod.VotingRecordsTable })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

const LazyCampaignFinanceVisualizer = dynamic(
  () =>
    import('@/components/CampaignFinanceVisualizer').then(mod => ({
      default: mod.CampaignFinanceVisualizer,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

const LazyEnhancedNewsFeed = dynamic(
  () => import('@/components/EnhancedNewsFeed').then(mod => ({ default: mod.EnhancedNewsFeed })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

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
    office?: string;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };
  committees?: Array<{
    name: string;
    role?: string;
  }>;
}

interface RepresentativeProfileClientProps {
  representative: RepresentativeDetails;
  initialData: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    votes: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bills: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    news: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    partyAlignment: any;
  };
  partialErrors: Record<string, string>;
  bioguideId: string;
  // Lazy-loaded components passed as props to prevent unnecessary bundling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VotingRecordsTable?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CampaignFinanceVisualizer?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EnhancedNewsFeed?: ComponentType<any>;
}

// Partial error display component
function PartialErrorDisplay({ partialErrors }: { partialErrors: Record<string, string> }) {
  const errorCount = Object.keys(partialErrors).length;

  if (errorCount === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <svg
          className="w-5 h-5 text-yellow-600 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
          />
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
  EnhancedNewsFeed = LazyEnhancedNewsFeed,
}: RepresentativeProfileClientProps) {
  const [activeTab, setActiveTab] = useState('profile');

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
              {
                id: 'finance',
                label: 'Campaign Finance',
                disabled: Object.keys(initialData.finance || {}).length === 0,
              },
              { id: 'news', label: 'News', disabled: initialData.news.length === 0 },
            ].map(tab => (
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Biography</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dl className="space-y-3">
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">Chamber:</dt>
                        <dd className="text-sm text-gray-900">
                          {representative.chamber || 'Unknown'}
                        </dd>
                      </div>
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">State:</dt>
                        <dd className="text-sm text-gray-900">
                          {representative.state || 'Unknown'}
                        </dd>
                      </div>
                      {representative.district && (
                        <div className="flex">
                          <dt className="w-24 text-sm font-medium text-gray-500">District:</dt>
                          <dd className="text-sm text-gray-900">{representative.district}</dd>
                        </div>
                      )}
                      <div className="flex">
                        <dt className="w-24 text-sm font-medium text-gray-500">Party:</dt>
                        <dd className="text-sm text-gray-900">
                          {representative.party || 'Unknown'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>

                    {/* Washington DC Office */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Washington, DC Office
                      </h5>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        {representative.currentTerm?.office && (
                          <div className="flex">
                            <dt className="w-16 text-sm font-medium text-gray-500">Office:</dt>
                            <dd className="text-sm text-gray-900">
                              {representative.currentTerm.office}
                            </dd>
                          </div>
                        )}
                        {representative.currentTerm?.address && (
                          <div className="flex">
                            <dt className="w-16 text-sm font-medium text-gray-500">Address:</dt>
                            <dd className="text-sm text-gray-900">
                              {representative.currentTerm.address}
                            </dd>
                          </div>
                        )}
                        {representative.currentTerm?.phone && (
                          <div className="flex">
                            <dt className="w-16 text-sm font-medium text-gray-500">Phone:</dt>
                            <dd className="text-sm text-gray-900">
                              <a
                                href={`tel:${representative.currentTerm.phone}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {representative.currentTerm.phone}
                              </a>
                            </dd>
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
                        <div className="flex">
                          <dt className="w-16 text-sm font-medium text-gray-500">Hours:</dt>
                          <dd className="text-sm text-gray-900">
                            Monday-Friday, 9:00 AM - 5:00 PM EST
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* State/District Offices */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        State/District Offices
                      </h5>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-yellow-600 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm text-yellow-800">
                            District office information not available in current data source
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          Please visit the official website or contact the Washington office for
                          local office locations and hours.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legislative Activity Stats */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Legislative Activity</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Bills Sponsored</h4>
                    <div className="text-2xl font-bold text-civiq-blue">
                      {initialData.bills.length}
                    </div>
                    <p className="text-sm text-gray-600">Total sponsored bills</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Committee Memberships
                    </h4>
                    <div className="text-2xl font-bold text-civiq-green">
                      {Array.isArray(representative.committees)
                        ? representative.committees.length
                        : 0}
                    </div>
                    <p className="text-sm text-gray-600">Active committees</p>
                  </div>
                </div>

                {/* Committee Details */}
                {Array.isArray(representative.committees) &&
                  representative.committees.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Committee Assignments
                      </h4>
                      <div className="space-y-3">
                        {representative.committees.map((committee: unknown, idx: number) => {
                          const comm = committee as {
                            thomas_id?: string;
                            id?: string;
                            name?: string;
                            role?: string;
                          };
                          return (
                            <div
                              key={idx}
                              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Link
                                  href={`/committee/${comm.thomas_id || comm.id || 'unknown'}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {comm.name || 'Unknown Committee'}
                                </Link>
                                {comm.role && (
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      comm.role === 'Chair'
                                        ? 'bg-green-100 text-green-800'
                                        : comm.role === 'Ranking Member'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-gray-200 text-gray-700'
                                    }`}
                                  >
                                    {comm.role}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                                <span>Click to view committee members and details</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Committee Overview */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-blue-600 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-sm text-blue-800 font-medium">
                            Committee Information
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          {representative.name} serves on {representative.committees.length}{' '}
                          committee{representative.committees.length !== 1 ? 's' : ''}. Committee
                          assignments determine legislative priorities and specialization areas.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Social Media */}
              {representative.socialMedia && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Social Media</h3>
                    <span className="text-xs text-gray-500">
                      Last updated: {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Twitter Feed */}
                    {representative.socialMedia.twitter && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <svg
                            className="w-5 h-5 text-blue-400 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <a
                            href={`https://twitter.com/${representative.socialMedia.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            @{representative.socialMedia.twitter}
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 space-y-2">
                          <div className="bg-white p-2 rounded border-l-2 border-blue-400">
                            <p className="text-gray-700">Latest tweets would appear here</p>
                            <p className="text-gray-500 text-xs mt-1">
                              Real-time Twitter feed integration coming soon
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Facebook Feed */}
                    {representative.socialMedia.facebook && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <svg
                            className="w-5 h-5 text-blue-600 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <a
                            href={`https://facebook.com/${representative.socialMedia.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {representative.socialMedia.facebook}
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 space-y-2">
                          <div className="bg-white p-2 rounded border-l-2 border-blue-600">
                            <p className="text-gray-700">Latest Facebook posts would appear here</p>
                            <p className="text-gray-500 text-xs mt-1">
                              Real-time Facebook feed integration coming soon
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* YouTube Feed */}
                    {representative.socialMedia.youtube && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <svg
                            className="w-5 h-5 text-red-600 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <a
                            href={`https://youtube.com/${representative.socialMedia.youtube}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            {representative.socialMedia.youtube}
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 space-y-2">
                          <div className="bg-white p-2 rounded border-l-2 border-red-600">
                            <p className="text-gray-700">Latest YouTube videos would appear here</p>
                            <p className="text-gray-500 text-xs mt-1">
                              Real-time YouTube feed integration coming soon
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Social Media Links */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4">
                      {representative.socialMedia.instagram && (
                        <a
                          href={`https://instagram.com/${representative.socialMedia.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-purple-600 hover:text-purple-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                          Instagram
                        </a>
                      )}
                      {representative.socialMedia.mastodon && (
                        <a
                          href={representative.socialMedia.mastodon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-purple-600 hover:text-purple-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.955 3.917 4.427 5.592 7.962 5.656 5.16.094 9.621-1.996 9.621-1.996l-.203-2.484s-4.402 1.386-9.35 1.216c-4.896-.168-10.067-.623-10.845-7.766-.093-.847-.132-1.699-.132-2.557 0-7.955 5.226-10.298 5.226-10.298 2.634-1.209 7.169-1.717 11.871-1.76h.118c4.703.043 9.24.551 11.871 1.76 0 0 5.226 2.343 5.226 10.298 0 0 .065 5.843-.651 9.916z" />
                          </svg>
                          Mastodon
                        </a>
                      )}
                    </div>
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
                {/* Voting Records Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Voting Records</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Party Alignment Analysis - Moved from Profile section */}
                {Object.keys(initialData.partyAlignment || {}).length > 0 &&
                  representative.party && (
                    <PartyAlignmentAnalysis
                      bioguideId={bioguideId}
                      representative={{
                        name: representative.name || 'Representative',
                        party: representative.party,
                        state: representative.state || 'Unknown',
                        chamber: representative.chamber || 'Unknown',
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
                  <VotingRecordsTable bioguideId={bioguideId} chamber={representative.chamber} />
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
              <div className="space-y-6">
                {/* Bills Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Sponsored Legislation</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Pre-rendered bills tracker with server data - no additional loading needed */}
                <BillsTracker bills={initialData.bills} representative={representative} />
              </div>
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
            ) : Object.keys(initialData.finance || {}).length > 0 ? (
              <div className="space-y-6">
                {/* Campaign Finance Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Campaign Finance</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Lazy-loaded heavy chart component with Suspense */}
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
                    bioguideId={bioguideId}
                  />
                </Suspense>
              </div>
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
              <div className="space-y-6">
                {/* News Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent News</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Lazy-loaded news feed with auto-refresh capability and Suspense */}
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
                  <EnhancedNewsFeed bioguideId={bioguideId} representative={representative} />
                </Suspense>
              </div>
            )}
          </LoadingErrorBoundary>
        )}
      </div>
    </>
  );
}

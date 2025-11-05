/**
 * State Bill Detail Page
 * Displays comprehensive information about a specific state bill
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Users,
  Building2,
  ExternalLink,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { StateBill, StateBillVote } from '@/types/state-legislature';

interface StateBillApiResponse {
  success: boolean;
  bill?: StateBill;
  error?: string;
}

export default function StateBillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const state = params.state as string;
  const base64BillId = params.billId as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'sponsors' | 'actions' | 'votes'>(
    'overview'
  );

  // Fetch bill data
  const { data, error, isLoading } = useSWR<StateBillApiResponse>(
    `/api/state-legislature/${state}/bill/${base64BillId}`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Date unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Date unknown';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="bg-white border-2 border-gray-300 p-8">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data?.success || !data?.bill) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill Not Found</h2>
            <p className="text-gray-600 mb-6">
              The bill you&apos;re looking for could not be found or has been removed.
            </p>
            <Link
              href={`/state-legislature/${state}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              View All Legislators
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bill = data.bill;
  const primarySponsor = bill.sponsorships.find(s => s.primary);
  const cosponsors = bill.sponsorships.filter(s => !s.primary);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {/* Bill Header */}
        <div className="bg-white border-2 border-black p-6 md:p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{bill.identifier}</h1>
              <p className="text-xl text-gray-700 mb-4">{bill.title}</p>
              {bill.abstract && <p className="text-gray-600 leading-relaxed">{bill.abstract}</p>}
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {bill.classification && bill.classification.length > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                <Building2 className="w-4 h-4" />
                {bill.classification[0]}
              </span>
            )}
            {bill.chamber && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                {bill.chamber === 'upper' ? 'Senate' : 'House'}
              </span>
            )}
            {bill.session && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                <Calendar className="w-4 h-4" />
                {bill.session}
              </span>
            )}
          </div>

          {/* Key Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            {bill.first_action_date && (
              <div>
                <div className="text-sm text-gray-600 mb-1">First Action</div>
                <div className="font-medium">{formatDate(bill.first_action_date)}</div>
              </div>
            )}
            {bill.latest_action_date && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Latest Action</div>
                <div className="font-medium">{formatDate(bill.latest_action_date)}</div>
              </div>
            )}
            {bill.updated_at && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Last Updated</div>
                <div className="font-medium">{formatDate(bill.updated_at)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-2 border-black mb-6">
          <nav className="flex">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'sponsors' as const, label: `Sponsors (${bill.sponsorships.length})` },
              { id: 'actions' as const, label: `Actions (${bill.actions.length})` },
              { id: 'votes' as const, label: `Votes (${bill.votes.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-r-2 last:border-r-0 border-black ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-white border-2 border-black p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Bill Details
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Identifier:</span>{' '}
                      <span className="text-gray-900">{bill.identifier}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">State:</span>{' '}
                      <span className="text-gray-900">{bill.state.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Session:</span>{' '}
                      <span className="text-gray-900">{bill.session}</span>
                    </div>
                    {bill.from_organization && (
                      <div>
                        <span className="font-medium text-gray-700">Origin:</span>{' '}
                        <span className="text-gray-900">{bill.from_organization}</span>
                      </div>
                    )}
                  </div>
                </div>

                {bill.subject && bill.subject.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      {bill.subject.map((subject, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sponsors' && (
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Sponsors & Co-Sponsors
                </h2>

                {primarySponsor && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Primary Sponsor</h3>
                    <div className="bg-blue-50 border-2 border-blue-200 p-4">
                      <div className="font-medium text-gray-900">{primarySponsor.name}</div>
                      {primarySponsor.entity_type && (
                        <div className="text-sm text-gray-600 mt-1">
                          Type: {primarySponsor.entity_type}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {cosponsors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Co-Sponsors ({cosponsors.length})
                    </h3>
                    <div className="space-y-2">
                      {cosponsors.map((sponsor, index) => (
                        <div key={index} className="bg-gray-50 border-2 border-gray-300 p-3">
                          <div className="font-medium text-gray-900">{sponsor.name}</div>
                          {sponsor.entity_type && (
                            <div className="text-sm text-gray-600 mt-1">
                              Type: {sponsor.entity_type}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bill.sponsorships.length === 0 && (
                  <p className="text-gray-600">No sponsor information available.</p>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Legislative Actions
                </h2>
                {bill.actions.length > 0 ? (
                  <div className="space-y-4">
                    {bill.actions.map((action, index) => (
                      <div key={index} className="border-l-4 border-blue-600 pl-4 py-2 bg-gray-50">
                        <div className="text-sm text-gray-600 mb-1">{formatDate(action.date)}</div>
                        <div className="text-gray-900 mb-1">{action.description}</div>
                        {action.organization && (
                          <div className="text-sm text-gray-600">
                            Organization: {action.organization}
                          </div>
                        )}
                        {action.classification && action.classification.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {action.classification.map((cls, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-white border border-gray-300 rounded"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No actions recorded.</p>
                )}
              </div>
            )}

            {activeTab === 'votes' && (
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Votes
                </h2>
                {bill.votes.length > 0 ? (
                  <div className="space-y-6">
                    {bill.votes.map((vote: StateBillVote, index: number) => (
                      <div key={index} className="bg-gray-50 border-2 border-gray-300 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 mb-1">{vote.motion_text}</div>
                            <div className="text-sm text-gray-600">
                              {formatDate(vote.start_date)} •{' '}
                              {vote.chamber === 'upper' ? 'Senate' : 'House'}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded ${
                              vote.result === 'passed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {vote.result === 'passed' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            {vote.result}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-200">
                          {vote.counts.map((count, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-2xl font-bold text-gray-900">{count.value}</div>
                              <div className="text-xs text-gray-600 uppercase">{count.option}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No votes recorded.</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* External Links */}
            {bill.sources && bill.sources.length > 0 && (
              <div className="bg-white border-2 border-black p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  External Sources
                </h3>
                <div className="space-y-2">
                  {bill.sources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-800 text-sm hover:underline flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {source.note || 'View Source'}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bill Versions */}
            {bill.versions && bill.versions.length > 0 && (
              <div className="bg-white border-2 border-black p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Bill Versions
                </h3>
                <div className="space-y-2">
                  {bill.versions.map((version, index) => (
                    <a
                      key={index}
                      href={version.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-800 text-sm hover:underline"
                    >
                      {version.note || `Version ${index + 1}`}
                      {version.date && ` (${formatDate(version.date)})`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white border-2 border-black p-4">
              <h3 className="font-semibold mb-3">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sponsors</span>
                  <span className="font-medium">{bill.sponsorships.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actions</span>
                  <span className="font-medium">{bill.actions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Votes</span>
                  <span className="font-medium">{bill.votes.length}</span>
                </div>
                {bill.subject && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subjects</span>
                    <span className="font-medium">{bill.subject.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

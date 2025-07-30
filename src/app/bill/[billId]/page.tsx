/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Users, FileText, Vote } from 'lucide-react';
import type { Bill, BillAPIResponse } from '@/types/bill';
import { getBillDisplayStatus, getBillStatusColor } from '@/types/bill';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

interface BillPageProps {
  params: Promise<{ billId: string }>;
}

// Fetch bill data
async function getBillData(billId: string): Promise<Bill | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/bill/${billId}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      return null;
    }

    const data: BillAPIResponse = await response.json();
    return data.bill;
  } catch {
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BillPageProps): Promise<Metadata> {
  const { billId } = await params;
  const bill = await getBillData(billId);

  const title = bill ? `${bill.number}: ${bill.title}` : `Bill ${billId}`;
  const description = bill
    ? `Learn about ${bill.number} - ${bill.title}. Current status: ${getBillDisplayStatus(bill.status.current)}. Sponsored by ${bill.sponsor.representative.name}.`
    : `Information about bill ${billId}`;

  return {
    title: `${title} | CIV.IQ`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

// Loading component for bill data
function BillLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bill content component
async function BillContent({ billId }: { billId: string }) {
  const bill = await getBillData(billId);

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/representatives"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Representatives
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h1>
            <p className="text-gray-600 mb-6">
              Sorry, we couldn&apos;t find information for bill &quot;{billId}&quot;.
            </p>
            <p className="text-sm text-gray-500">
              This bill may not exist or data may be temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/representatives"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Representatives
        </Link>

        {/* Bill Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">{bill.number}</h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getBillStatusColor(bill.status.current)}`}
                >
                  {getBillDisplayStatus(bill.status.current)}
                </span>
              </div>
              <h2 className="text-xl text-gray-700 mb-4 leading-relaxed">{bill.title}</h2>
              <div className="flex items-center text-gray-600 mb-4">
                <Calendar className="w-5 h-5 mr-2" />
                <span>Introduced {new Date(bill.introducedDate).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>{bill.congress}th Congress</span>
                <span className="mx-2">•</span>
                <span>{bill.chamber}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {bill.url && (
                <Link
                  href={bill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Congress.gov
                </Link>
              )}
              {bill.textUrl && (
                <Link
                  href={bill.textUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Full Text
                </Link>
              )}
            </div>
          </div>

          {/* Last Action */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Latest Action</h3>
            <p className="text-gray-700 mb-1">{bill.status.lastAction.description}</p>
            <p className="text-sm text-gray-500">
              {new Date(bill.status.lastAction.date).toLocaleDateString()}
              {bill.status.lastAction.chamber && ` • ${bill.status.lastAction.chamber}`}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            {bill.summary && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                <p className="text-gray-700 leading-relaxed mb-3">{bill.summary.text}</p>
                <p className="text-sm text-gray-500">
                  {bill.summary.version} • {new Date(bill.summary.date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Sponsor and Cosponsors */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sponsor & Cosponsors ({bill.cosponsors.length + 1})
              </h3>

              {/* Sponsor */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Sponsor</h4>
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <RepresentativePhoto
                    bioguideId={bill.sponsor.representative.bioguideId}
                    name={bill.sponsor.representative.name}
                    size="md"
                  />
                  <div>
                    <Link
                      href={`/representative/${bill.sponsor.representative.bioguideId}`}
                      className="text-lg font-medium text-blue-600 hover:text-blue-800"
                    >
                      {bill.sponsor.representative.name}
                    </Link>
                    <p className="text-gray-600">
                      {bill.sponsor.representative.party === 'D' ? 'Democrat' : 'Republican'} •{' '}
                      {bill.sponsor.representative.state}
                      {bill.sponsor.representative.district &&
                        `-${bill.sponsor.representative.district}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      Sponsored {new Date(bill.sponsor.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cosponsors */}
              {bill.cosponsors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Cosponsors ({bill.cosponsors.length})
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {bill.cosponsors.slice(0, 6).map(cosponsor => (
                      <div
                        key={cosponsor.representative.bioguideId}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <RepresentativePhoto
                          bioguideId={cosponsor.representative.bioguideId}
                          name={cosponsor.representative.name}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/representative/${cosponsor.representative.bioguideId}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                          >
                            {cosponsor.representative.name}
                          </Link>
                          <p className="text-xs text-gray-500 truncate">
                            {cosponsor.representative.party === 'D' ? 'D' : 'R'}-
                            {cosponsor.representative.state}
                            {cosponsor.representative.district &&
                              `-${cosponsor.representative.district}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {bill.cosponsors.length > 6 && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      And {bill.cosponsors.length - 6} more cosponsors
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Votes */}
            {bill.votes.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Vote className="w-5 h-5 mr-2" />
                  Voting Records ({bill.votes.length})
                </h3>
                <div className="space-y-4">
                  {bill.votes.map(vote => (
                    <div key={vote.voteId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{vote.question}</h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            vote.result.includes('Passed')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {vote.result}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {vote.chamber} • {new Date(vote.date).toLocaleDateString()}
                        {vote.rollNumber && ` • Roll #${vote.rollNumber}`}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-green-600">{vote.votes.yea}</div>
                          <div className="text-gray-500">Yea</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-red-600">{vote.votes.nay}</div>
                          <div className="text-gray-500">Nay</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-blue-600">{vote.votes.present}</div>
                          <div className="text-gray-500">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-600">{vote.votes.notVoting}</div>
                          <div className="text-gray-500">Not Voting</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Committees */}
            {bill.committees.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Committees ({bill.committees.length})
                </h3>
                <div className="space-y-3">
                  {bill.committees.map(committee => (
                    <div key={committee.committeeId}>
                      <Link
                        href={`/committee/${committee.committeeId}`}
                        className="block text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        {committee.name}
                      </Link>
                      <p className="text-xs text-gray-500 mb-2">{committee.chamber}</p>
                      {committee.activities.length > 0 && (
                        <div className="ml-3 space-y-1">
                          {committee.activities.slice(0, 2).map((activity, index) => (
                            <p key={index} className="text-xs text-gray-600">
                              • {activity.activity} ({new Date(activity.date).toLocaleDateString()})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subjects */}
            {bill.subjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {bill.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Bills */}
            {bill.relatedBills.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Bills</h3>
                <div className="space-y-3">
                  {bill.relatedBills.map((related, index) => (
                    <div key={index}>
                      <Link
                        href={`/bill/${related.number}`}
                        className="block text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        {related.number}
                      </Link>
                      <p className="text-xs text-gray-600 mb-1">{related.title}</p>
                      <span className="text-xs text-gray-500 capitalize">
                        {related.relationship}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                {bill.status.timeline.slice(0, 5).map((action, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{action.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(action.date).toLocaleDateString()}
                        {action.chamber && ` • ${action.chamber}`}
                      </p>
                    </div>
                  </div>
                ))}
                {bill.status.timeline.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    And {bill.status.timeline.length - 5} more actions
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main bill page component
export default async function BillPage({ params }: BillPageProps) {
  const { billId } = await params;

  return (
    <Suspense fallback={<BillLoading />}>
      <BillContent billId={billId} />
    </Suspense>
  );
}

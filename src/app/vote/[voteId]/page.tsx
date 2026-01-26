/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Detailed Vote Analysis Page
 *
 * This page displays comprehensive information about a specific Senate roll call vote,
 * including all senators' positions, vote counts, and related bill information.
 */

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import logger from '@/lib/logging/simple-logger';
import { findBioguideId } from '@/lib/data/senate-member-mappings';
import { Breadcrumb, SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';
import { getVoteDetailsService } from '@/lib/services/vote.service';

// Types for the vote detail data
interface VoteDetail {
  voteId: string;
  congress: string;
  session: string;
  rollNumber: number;
  chamber: 'House' | 'Senate';
  date: string;
  time?: string;
  title: string;
  question: string;
  description: string;
  result: string;
  yeas: number;
  nays: number;
  present: number;
  absent: number;
  totalVotes: number;
  requiredMajority?: string;
  members: SenatorVote[];
  bill?: {
    number: string;
    title: string;
    type: string;
    summary?: string;
  };
  amendment?: {
    number: string;
    purpose: string;
  };
  metadata: {
    source: string;
    confidence: string;
    processingDate: string;
    xmlUrl: string;
  };
}

interface SenatorVote {
  lisId: string;
  bioguideId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  state: string;
  party: 'D' | 'R' | 'I';
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

interface VoteDetailPageProps {
  params: Promise<{ voteId: string }>;
  searchParams: Promise<{ from?: string; name?: string }>;
}

// Fetch vote details directly from service (no HTTP roundtrip)
async function fetchVoteDetails(voteId: string): Promise<VoteDetail | null> {
  try {
    const vote = await getVoteDetailsService(voteId);
    return vote as VoteDetail | null;
  } catch (error) {
    logger.error('Error fetching vote details', error as Error, { voteId });
    return null;
  }
}

// Main page component
export default async function VoteDetailPage({ params, searchParams }: VoteDetailPageProps) {
  const { voteId } = await params;
  const { from: fromBioguideId, name: fromRepName } = await searchParams;
  const voteDetail = await fetchVoteDetails(voteId);

  if (!voteDetail) {
    return (
      <div className="min-h-screen aicher-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb navigation */}
          {fromBioguideId && fromRepName ? (
            <Breadcrumb
              currentPage="Vote Not Found"
              fromBioguideId={fromBioguideId}
              fromRepName={fromRepName}
            />
          ) : (
            <SimpleBreadcrumb />
          )}

          <div className="aicher-card p-8 text-center">
            <h1 className="aicher-heading text-2xl text-gray-900 mb-4">Vote Not Found</h1>
            <p className="text-gray-600 mb-6">
              The requested vote (ID: {voteId}) could not be found or is not available.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Group senators by their vote position
  const votesByPosition = {
    Yea: voteDetail.members.filter(member => member.position === 'Yea'),
    Nay: voteDetail.members.filter(member => member.position === 'Nay'),
    Present: voteDetail.members.filter(member => member.position === 'Present'),
    'Not Voting': voteDetail.members.filter(member => member.position === 'Not Voting'),
  };

  // Group senators by party for analysis
  const votesByParty = {
    D: voteDetail.members.filter(member => member.party === 'D'),
    R: voteDetail.members.filter(member => member.party === 'R'),
    I: voteDetail.members.filter(member => member.party === 'I'),
  };

  const partyBreakdown = {
    D: {
      yea: votesByParty.D.filter(m => m.position === 'Yea').length,
      nay: votesByParty.D.filter(m => m.position === 'Nay').length,
      present: votesByParty.D.filter(m => m.position === 'Present').length,
      absent: votesByParty.D.filter(m => m.position === 'Not Voting').length,
    },
    R: {
      yea: votesByParty.R.filter(m => m.position === 'Yea').length,
      nay: votesByParty.R.filter(m => m.position === 'Nay').length,
      present: votesByParty.R.filter(m => m.position === 'Present').length,
      absent: votesByParty.R.filter(m => m.position === 'Not Voting').length,
    },
    I: {
      yea: votesByParty.I.filter(m => m.position === 'Yea').length,
      nay: votesByParty.I.filter(m => m.position === 'Nay').length,
      present: votesByParty.I.filter(m => m.position === 'Present').length,
      absent: votesByParty.I.filter(m => m.position === 'Not Voting').length,
    },
  };

  return (
    <div className="min-h-screen aicher-background density-detailed py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb navigation */}
        {fromBioguideId && fromRepName ? (
          <Breadcrumb
            currentPage={voteDetail.title}
            fromBioguideId={fromBioguideId}
            fromRepName={fromRepName}
          />
        ) : (
          <SimpleBreadcrumb />
        )}

        {/* Vote Header */}
        <div className="aicher-card mb-6 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="aicher-heading text-3xl text-gray-900 mb-2">
                {voteDetail.title}
                {voteDetail.bill?.number &&
                  `: ${voteDetail.bill.type || ''} ${voteDetail.bill.number}`}
              </h1>
              {/* Show bill title prominently if available */}
              {voteDetail.bill?.title &&
                voteDetail.bill.title !== `${voteDetail.bill.type} ${voteDetail.bill.number}` && (
                  <p className="text-lg text-blue-700 font-medium mb-2">{voteDetail.bill.title}</p>
                )}
              <p className="text-gray-600">
                {voteDetail.chamber} Roll Call #{voteDetail.rollNumber} • {voteDetail.congress}th
                Congress
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  voteDetail.result.toLowerCase().includes('passed') ||
                  voteDetail.result.toLowerCase().includes('agreed')
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {voteDetail.result}
              </div>
              <div className="text-sm text-gray-500">Roll Call #{voteDetail.rollNumber}</div>
            </div>
          </div>

          {/* What This Vote Means */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">What This Vote Means</h3>
            <p className="text-sm text-blue-800">
              {(() => {
                const q = voteDetail.question.toLowerCase();
                const r = voteDetail.result.toLowerCase();
                const chamber = voteDetail.chamber || 'Senate';
                const otherChamber = chamber === 'House' ? 'Senate' : 'House of Representatives';

                if (q.includes('cloture')) {
                  if (r.includes('agreed') || r.includes('invoked')) {
                    return `The ${chamber} voted to end debate and move forward with this bill. This breaks any filibuster and allows the ${chamber} to proceed to a final vote.`;
                  }
                  return `The ${chamber} voted NOT to end debate. The filibuster continues, and the bill cannot move forward to a final vote at this time. 60 votes were needed.`;
                }
                if (q.includes('passage') || q.includes('pass the bill')) {
                  if (r.includes('passed')) {
                    return `The bill PASSED the ${chamber} and will now move to the ${otherChamber} (or to the President if already passed by the ${otherChamber}).`;
                  }
                  return 'The bill FAILED to pass. It will not become law unless reconsidered.';
                }
                if (q.includes('confirmation')) {
                  if (r.includes('confirmed')) {
                    return `The ${chamber} CONFIRMED this nomination. The nominee will assume their position.`;
                  }
                  return `The ${chamber} REJECTED this nomination. The nominee will not assume the position.`;
                }
                if (q.includes('amendment')) {
                  if (r.includes('agreed')) {
                    return 'This amendment was ADOPTED and will be included in the bill.';
                  }
                  return 'This amendment was REJECTED and will not be included in the bill.';
                }
                if (q.includes('motion to') || q.includes('agreeing to the resolution')) {
                  if (r.includes('agreed') || r.includes('passed')) {
                    return `The ${chamber} APPROVED this measure.`;
                  }
                  return `The ${chamber} REJECTED this procedural motion.`;
                }
                if (r.includes('passed') || r.includes('agreed')) {
                  return `This measure PASSED the ${chamber}.`;
                }
                return `This measure did NOT pass the ${chamber}.`;
              })()}
            </p>
            {voteDetail.requiredMajority && (
              <p className="text-xs text-blue-700 mt-2">
                <strong>Required to pass:</strong> {voteDetail.requiredMajority} majority
                {voteDetail.requiredMajority === '3/5' && ' (60 votes)'}
                {voteDetail.requiredMajority === '2/3' && ' (67 votes)'}
                {voteDetail.requiredMajority === '1/2' && ' (51 votes, or 50 + VP)'}
              </p>
            )}
            {voteDetail.metadata?.xmlUrl && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <a
                  href={voteDetail.metadata.xmlUrl.replace('.xml', '.htm')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View official vote record on{' '}
                  {voteDetail.chamber === 'House' ? 'House.gov' : 'Senate.gov'}
                </a>
              </div>
            )}
          </div>

          {/* Bill Context - CRITICAL HYPERLINK */}
          {voteDetail.bill && voteDetail.bill.number && (
            <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                About {voteDetail.bill.number}
              </h3>
              {voteDetail.bill.title && (
                <p className="text-sm text-gray-700 mb-3">{voteDetail.bill.title}</p>
              )}
              {voteDetail.bill.summary && (
                <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Congressional Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{voteDetail.bill.summary}</p>
                </div>
              )}
              <Link
                href={`/bill/${voteDetail.congress}-${voteDetail.bill.type?.toLowerCase().replace(/\./g, '') || (voteDetail.chamber === 'House' ? 'hr' : 's')}-${voteDetail.bill.number.replace(/[^\d]/g, '')}`}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                View Full Bill Details →
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                See sponsors, cosponsors, summary, and legislative timeline
              </p>
            </div>
          )}

          {/* Vote Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(voteDetail.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {voteDetail.time && ` at ${voteDetail.time}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {voteDetail.congress}th Congress, Session {voteDetail.session}
              </span>
            </div>
            {voteDetail.bill && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {voteDetail.bill.number} - {voteDetail.bill.type}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vote Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="aicher-card p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{voteDetail.yeas}</div>
            <div className="text-sm text-gray-500">Yea</div>
            <div className="text-xs text-gray-400 mt-1">
              {((voteDetail.yeas / voteDetail.totalVotes) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="aicher-card p-6 text-center">
            <div className="text-3xl font-bold text-red-600">{voteDetail.nays}</div>
            <div className="text-sm text-gray-500">Nay</div>
            <div className="text-xs text-gray-400 mt-1">
              {((voteDetail.nays / voteDetail.totalVotes) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="aicher-card p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{voteDetail.present}</div>
            <div className="text-sm text-gray-500">Present</div>
            <div className="text-xs text-gray-400 mt-1">
              {((voteDetail.present / voteDetail.totalVotes) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="aicher-card p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{voteDetail.absent}</div>
            <div className="text-sm text-gray-500">Not Voting</div>
            <div className="text-xs text-gray-400 mt-1">
              {((voteDetail.absent / voteDetail.totalVotes) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Party Breakdown */}
        <div className="aicher-card mb-6 p-6">
          <h2 className="aicher-heading text-xl text-gray-900 mb-4">Vote by Party</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-600 mb-2">
                Democrats ({votesByParty.D.length})
              </h3>
              <div className="space-y-1 text-sm">
                <div>Yea: {partyBreakdown.D.yea}</div>
                <div>Nay: {partyBreakdown.D.nay}</div>
                {partyBreakdown.D.present > 0 && <div>Present: {partyBreakdown.D.present}</div>}
                {partyBreakdown.D.absent > 0 && <div>Not Voting: {partyBreakdown.D.absent}</div>}
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-red-600 mb-2">
                Republicans ({votesByParty.R.length})
              </h3>
              <div className="space-y-1 text-sm">
                <div>Yea: {partyBreakdown.R.yea}</div>
                <div>Nay: {partyBreakdown.R.nay}</div>
                {partyBreakdown.R.present > 0 && <div>Present: {partyBreakdown.R.present}</div>}
                {partyBreakdown.R.absent > 0 && <div>Not Voting: {partyBreakdown.R.absent}</div>}
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-green-600 mb-2">
                Independents ({votesByParty.I.length})
              </h3>
              <div className="space-y-1 text-sm">
                <div>Yea: {partyBreakdown.I.yea}</div>
                <div>Nay: {partyBreakdown.I.nay}</div>
                {partyBreakdown.I.present > 0 && <div>Present: {partyBreakdown.I.present}</div>}
                {partyBreakdown.I.absent > 0 && <div>Not Voting: {partyBreakdown.I.absent}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Data Availability Notice */}
        {voteDetail.members.length === 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Individual Member Votes Loading
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  {voteDetail.metadata?.source?.includes('house') || voteId.startsWith('house-') ? (
                    <div>
                      <p className="mb-2">
                        <strong>House Roll Call:</strong> Individual member positions are being
                        processed from official XML data.
                      </p>
                      <p>
                        The vote totals shown above reflect the final counts. Individual
                        representative positions will be displayed once the XML parsing is complete.
                        This process may take a few moments for House votes with 435 members.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2">
                        <strong>Senate Roll Call:</strong> Individual senator positions are being
                        loaded from official sources.
                      </p>
                      <p>
                        The vote totals are accurate. Senator-by-senator breakdowns will appear
                        shortly as the data is processed from the Senate XML feed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Senator Votes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(votesByPosition).map(([position, senators]) => {
            if (senators.length === 0) return null;

            const positionColors = {
              Yea: 'bg-green-50 border-green-200',
              Nay: 'bg-red-50 border-red-200',
              Present: 'bg-yellow-50 border-yellow-200',
              'Not Voting': 'bg-white border-gray-200',
            };

            const iconColors = {
              Yea: 'text-green-600',
              Nay: 'text-red-600',
              Present: 'text-yellow-600',
              'Not Voting': 'text-gray-600',
            };

            return (
              <div
                key={position}
                className={`aicher-card p-6 ${positionColors[position as keyof typeof positionColors]}`}
              >
                <h3 className="aicher-heading text-lg text-gray-900 mb-4 flex items-center gap-2">
                  {position === 'Yea' && (
                    <CheckCircle className={`h-5 w-5 ${iconColors[position]}`} />
                  )}
                  {position === 'Nay' && <XCircle className={`h-5 w-5 ${iconColors[position]}`} />}
                  {position === 'Present' && (
                    <Clock className={`h-5 w-5 ${iconColors[position]}`} />
                  )}
                  {position === 'Not Voting' && (
                    <User className={`h-5 w-5 ${iconColors[position]}`} />
                  )}
                  {position} ({senators.length})
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {senators.map(senator => (
                    <div
                      key={senator.lisId}
                      className="flex items-center justify-between py-2 px-3 bg-white rounded border"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {(() => {
                            // Enhanced bioguide ID lookup with mapping fallback
                            const bioguideId = findBioguideId({
                              firstName: senator.firstName,
                              lastName: senator.lastName,
                              fullName: senator.fullName,
                              state: senator.state,
                              bioguideId: senator.bioguideId,
                            });

                            // Debug logging for unmapped members
                            if (!senator.bioguideId && !bioguideId) {
                              logger.warn('No bioguide ID found for senator', {
                                firstName: senator.firstName,
                                lastName: senator.lastName,
                                state: senator.state,
                                fullName: senator.fullName,
                                lisId: senator.lisId,
                              });
                            }

                            return bioguideId ? (
                              <Link
                                href={`/representative/${bioguideId}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                title={`View ${senator.firstName} ${senator.lastName}'s profile`}
                              >
                                {senator.firstName} {senator.lastName}
                              </Link>
                            ) : (
                              <span>
                                {senator.firstName} {senator.lastName}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-sm text-gray-500">{senator.state}</div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          senator.party === 'D'
                            ? 'text-blue-600'
                            : senator.party === 'R'
                              ? 'text-red-600'
                              : 'text-green-600'
                        }`}
                      >
                        {senator.party === 'D'
                          ? 'Democrat'
                          : senator.party === 'R'
                            ? 'Republican'
                            : 'Independent'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Metadata Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Data source: {voteDetail.metadata.source} • Processed:{' '}
            {new Date(voteDetail.metadata.processingDate).toLocaleDateString()} • Confidence:{' '}
            {voteDetail.metadata.confidence}
          </p>
        </div>
      </div>
    </div>
  );
}

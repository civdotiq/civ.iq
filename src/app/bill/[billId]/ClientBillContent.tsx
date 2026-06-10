'use client';

import { useState, useEffect, useMemo } from 'react';
import { sanitizeBillHtml } from '@/utils/sanitize';
import Link from 'next/link';
import { RepLink } from '@/components/shared/links/EntityLinks';
import {
  ExternalLink,
  Calendar,
  FileText,
  Vote,
  CheckCircle,
  XCircle,
  Tag,
  DollarSign,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Gavel,
  Brain,
  ArrowRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { Bill, BillVote } from '@/types/bill';
import { getBillDisplayStatus, getBillStatusColor } from '@/types/bill';
import { getPartyColors } from '@/lib/party-colors';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { BillJourneyTimeline } from '@/features/legislation/components/BillJourneyTimeline';
import {
  BillSummary as BillSummaryDisplay,
  BillSummaryStreaming,
  BillSummaryError,
} from '@/features/legislation/components/BillSummary';
import { useBillSummaryStream } from '@/features/legislation/hooks/useBillSummaryStream';
import {
  DistrictImpactDisplay,
  DistrictImpactError,
} from '@/features/legislation/components/DistrictImpact';
import { DistrictSelector } from '@/features/legislation/components/DistrictSelector';
import type { DistrictImpact as DistrictImpactType } from '@/types/district-impact';
import type { ProcessExplanation } from '@/types/ai';
import { useSearchParams } from 'next/navigation';
import { BillSpendingSection } from '@/features/legislation/components/BillSpendingSection';
import { BillIntelligenceSection } from '@/components/intelligence/BillIntelligenceSection';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { SkeletonLoader } from '@/shared/components/ui/SkeletonLoader';

interface ClientBillContentProps {
  billId: string;
}

export function ClientBillContent({ billId }: ClientBillContentProps) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [districtImpact, setDistrictImpact] = useState<DistrictImpactType | null>(null);
  const [districtImpactLoading, setDistrictImpactLoading] = useState(false);
  const [districtImpactError, setDistrictImpactError] = useState<string | null>(null);
  const [processExplanation, setProcessExplanation] = useState<ProcessExplanation | null>(null);
  const [processLoading, setProcessLoading] = useState(false);
  const searchParams = useSearchParams();

  // Streaming AI summary hook — only enabled after bill loads
  const {
    summary: aiSummary,
    streamingText: aiStreamingText,
    isStreaming: aiIsStreaming,
    error: aiSummaryError,
  } = useBillSummaryStream(billId, !!bill);

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/bill/${billId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Bill not found');
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.bill) {
          setBill(data.bill);
        } else {
          setError('Bill data unavailable');
        }
      } catch {
        setError('Failed to load bill data');
      } finally {
        setLoading(false);
      }
    }

    fetchBill();
  }, [billId]);

  // Fetch legislative process explanation when bill is loaded
  useEffect(() => {
    if (!bill) return;
    let cancelled = false;

    async function fetchProcess() {
      try {
        setProcessLoading(true);
        const response = await fetch(`/api/ai/legislative-process/${billId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.explanation) {
          setProcessExplanation(data.explanation);
        }
      } catch {
        // Non-critical — silently fail
      } finally {
        if (!cancelled) setProcessLoading(false);
      }
    }

    fetchProcess();
    return () => {
      cancelled = true;
    };
  }, [bill, billId]);

  // Initialize district from URL param or localStorage
  useEffect(() => {
    const urlDistrict = searchParams.get('district');
    if (urlDistrict && /^[A-Z]{2}-\d{1,2}$/i.test(urlDistrict)) {
      setDistrict(urlDistrict.toUpperCase());
      return;
    }
    try {
      const stored = localStorage.getItem('civiq-district');
      if (stored && /^[A-Z]{2}-\d{1,2}$/i.test(stored)) {
        setDistrict(stored.toUpperCase());
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [searchParams]);

  // Fetch district impact when district is set and bill is loaded
  useEffect(() => {
    if (!bill || !district) return;
    let cancelled = false;

    async function fetchDistrictImpact() {
      try {
        setDistrictImpactLoading(true);
        setDistrictImpactError(null);
        const response = await fetch(`/api/bill/${billId}/district-impact/${district}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.impact) {
          setDistrictImpact(data.impact);
        }
      } catch {
        if (!cancelled) setDistrictImpactError('District impact analysis unavailable');
      } finally {
        if (!cancelled) setDistrictImpactLoading(false);
      }
    }

    fetchDistrictImpact();
    return () => {
      cancelled = true;
    };
  }, [bill, billId, district]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader variant="text" />
        <SkeletonLoader
          variant="stat"
          count={4}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        />
        <SkeletonLoader variant="card" count={3} />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="bg-white border-2 border-black p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h1>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn&apos;t find information for bill &quot;{billId}&quot;.
        </p>
        <p className="text-sm text-gray-500">
          {error || 'This bill may not exist or data may be temporarily unavailable.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bill Header */}
      <div className="bg-white border-2 border-black p-4 sm:p-8" data-speakable="bill-summary">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
            <h1 className="text-3xl accent-title-underline text-gray-900">{bill.number}</h1>
            <span
              className={`px-3 py-1 text-sm font-medium ${getBillStatusColor(bill.status.current)}`}
            >
              {getBillDisplayStatus(bill.status.current)}
            </span>
          </div>
          <h2 className="text-xl text-gray-700 mb-4 leading-relaxed">{bill.title}</h2>
          <div className="flex flex-wrap items-center gap-y-1 text-gray-600 mb-4">
            <Calendar className="w-5 h-5 mr-2" />
            <span>Introduced {new Date(bill.introducedDate).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{bill.congress}th Congress</span>
            <span className="mx-2">•</span>
            <span>{bill.chamber}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {bill.url && (
              <Link
                href={bill.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-civiq-blue text-white hover:bg-civiq-blue transition-colors"
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
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 hover:bg-white transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Full Text
              </Link>
            )}
          </div>
        </div>

        {/* Last Action */}
        <div className="bg-white p-4">
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
          <div className="bg-white border-2 border-black p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {bill.summary ? 'Summary' : 'Bill Information'}
            </h3>
            {bill.summary ? (
              <>
                <p className="text-gray-700 leading-relaxed mb-3">{bill.summary.text}</p>
                <p className="text-sm text-gray-500">
                  {bill.summary.version} • {new Date(bill.summary.date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  This is {bill.type.toUpperCase()}. {bill.number}, &ldquo;{bill.title}&rdquo;
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Congress
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {bill.congress}th Congress
                    </div>
                  </div>
                  <div className="bg-white p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Chamber
                    </div>
                    <div className="text-sm font-medium text-gray-900">{bill.chamber}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Summary not yet available from Congress.gov
                </p>
              </div>
            )}
          </div>

          {/* AI-Generated Plain English Summary */}
          {aiIsStreaming && aiStreamingText && (
            <BillSummaryStreaming streamingText={aiStreamingText} />
          )}
          {aiSummaryError && !aiIsStreaming && <BillSummaryError error={aiSummaryError} />}
          {aiSummary && !aiIsStreaming && <BillSummaryDisplay summary={aiSummary} />}

          {/* Legislative Process Explainer */}
          {processLoading && (
            <div className="bg-white border-2 border-black p-6 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-5 bg-gray-300"></div>
                <div className="h-4 w-48 bg-gray-300"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200"></div>
                <div className="h-4 w-4/5 bg-gray-200"></div>
              </div>
            </div>
          )}
          {processExplanation && !processLoading && (
            <LegislativeProcessSection explanation={processExplanation} />
          )}

          {/* District Impact Analysis */}
          <DistrictSelector
            currentDistrict={district}
            onDistrictChange={newDistrict => {
              setDistrict(newDistrict);
              setDistrictImpact(null);
              setDistrictImpactError(null);
            }}
          />
          {district && districtImpactLoading && (
            <LoadingState message="Loading district impact..." />
          )}
          {district && districtImpactError && !districtImpactLoading && (
            <DistrictImpactError
              error={districtImpactError}
              onRetry={() => {
                setDistrictImpactError(null);
                setDistrictImpact(null);
                // Trigger re-fetch by toggling district
                const d = district;
                setDistrict(null);
                setTimeout(() => setDistrict(d), 0);
              }}
            />
          )}
          {district && districtImpact && !districtImpactLoading && (
            <DistrictImpactDisplay impact={districtImpact} />
          )}

          {/* Policy Area & Subjects */}
          {(bill.policyArea || (bill.subjects && bill.subjects.length > 0)) && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-civiq-blue" />
                Topics & Subjects
              </h3>

              {bill.policyArea && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-600">Policy Area: </span>
                  <span className="inline-flex items-center px-3 py-1 bg-civiq-blue/10 text-civiq-blue font-medium text-sm border border-civiq-blue/20">
                    {bill.policyArea}
                  </span>
                </div>
              )}

              {bill.subjects && bill.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {bill.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm border border-gray-200"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bill Text Section */}
          {bill.fullText && <BillTextSection fullText={bill.fullText} />}

          {/* CBO Cost Estimates */}
          {bill.cboCostEstimates && bill.cboCostEstimates.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-civiq-green" />
                CBO Cost Estimates ({bill.cboCostEstimates.length})
              </h3>
              <div className="space-y-3">
                {bill.cboCostEstimates.map((estimate, index) => (
                  <a
                    key={index}
                    href={estimate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 hover:border-civiq-green hover:bg-civiq-green/10 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{estimate.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{estimate.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Published:{' '}
                          {new Date(estimate.pubDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-civiq-green flex-shrink-0 ml-2" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Amendments */}
          {bill.amendments && bill.amendments.count > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-civiq-red" />
                Amendments ({bill.amendments.count})
              </h3>
              <div className="p-4 bg-civiq-red/10 border border-civiq-red">
                <p className="text-gray-700">
                  This bill has <span className="font-bold">{bill.amendments.count}</span> amendment
                  {bill.amendments.count === 1 ? '' : 's'} proposed or adopted.
                </p>
                {bill.url && (
                  <a
                    href={`${bill.url}/amendments`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-civiq-red hover:text-civiq-red font-medium"
                  >
                    View all amendments on Congress.gov
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Congressional Votes - The Critical Link */}
          <div className="bg-white border-2 border-black p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-civiq-blue" />
              Congressional Votes ({bill.votes?.length || 0})
            </h3>

            {bill.votes && bill.votes.length > 0 ? (
              <div className="space-y-4">
                {bill.votes.map((vote: BillVote, index: number) => {
                  const isPassed = vote.result === 'Passed' || vote.result === 'Agreed to';

                  return (
                    <Link
                      key={`${vote.voteId || 'vote'}-${index}`}
                      href={`/vote/${vote.rollNumber || vote.voteId}`}
                      className="block p-4 border-2 border-gray-200 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isPassed ? (
                              <CheckCircle className="w-5 h-5 text-civiq-blue" />
                            ) : (
                              <XCircle className="w-5 h-5 text-amber-600" />
                            )}
                            <span
                              className={`font-semibold ${isPassed ? 'text-civiq-blue' : 'text-amber-600'}`}
                            >
                              {vote.result}
                            </span>
                            <span className="text-sm text-gray-500">
                              {vote.chamber} • Roll Call #{vote.rollNumber}
                            </span>
                          </div>
                          <p className="text-gray-800 font-medium">{vote.question}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(vote.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Vote Breakdown */}
                      {vote.votes ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
                          <div className="text-center p-2 bg-civiq-green/10">
                            <div className="text-lg font-bold text-civiq-green">
                              {vote.votes.yea}
                            </div>
                            <div className="text-xs text-civiq-green">Yea</div>
                          </div>
                          <div className="text-center p-2 bg-civiq-red/10">
                            <div className="text-lg font-bold text-civiq-red">{vote.votes.nay}</div>
                            <div className="text-xs text-civiq-red">Nay</div>
                          </div>
                          <div className="text-center p-2 bg-gray-100">
                            <div className="text-lg font-bold text-gray-600">
                              {vote.votes.present}
                            </div>
                            <div className="text-xs text-gray-600">Present</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50">
                            <div className="text-lg font-bold text-gray-700">
                              {vote.votes.notVoting}
                            </div>
                            <div className="text-xs text-gray-600">Not Voting</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-3 bg-gray-50 mb-3">
                          <p className="text-sm text-gray-600">
                            Vote counts unavailable from Congress.gov
                          </p>
                        </div>
                      )}

                      {/* Party Breakdown — Visual Bars */}
                      {vote.breakdown ? (
                        <div className="space-y-3">
                          {/* Stacked vote bar */}
                          <VoteBar vote={vote} />
                          {/* Party text breakdown */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-party-dem/10 p-2">
                              <div className="font-medium text-party-dem mb-1">Democrats</div>
                              <div className="text-party-dem">
                                {vote.breakdown.democratic.yea} Yea /{' '}
                                {vote.breakdown.democratic.nay} Nay
                              </div>
                            </div>
                            <div className="bg-civiq-red/10 p-2">
                              <div className="font-medium text-civiq-red mb-1">Republicans</div>
                              <div className="text-civiq-red">
                                {vote.breakdown.republican.yea} Yea /{' '}
                                {vote.breakdown.republican.nay} Nay
                              </div>
                            </div>
                            <div className="bg-gray-50 p-2">
                              <div className="font-medium text-gray-800 mb-1">Independents</div>
                              <div className="text-gray-700">
                                {vote.breakdown.independent.yea} Yea /{' '}
                                {vote.breakdown.independent.nay} Nay
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 text-sm text-civiq-blue font-medium flex items-center gap-1">
                        View all {vote.chamber === 'Senate' ? '100' : '435'} member votes →
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50">
                <Vote className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No recorded votes yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Roll call votes will appear here as the bill moves through Congress
                </p>
              </div>
            )}
          </div>

          {/* Related Federal Spending */}
          <BillSpendingSection billId={billId} />

          {/* Intelligence */}
          <BillIntelligenceSection billId={billId} />

          {/* Sponsor and Cosponsors */}
          <div className="bg-white border-2 border-black p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sponsor & Cosponsors ({bill.cosponsors.length + 1})
            </h3>

            {/* Party Breakdown */}
            {bill.cosponsors.length > 0 && (
              <div className="mb-6 p-4 bg-white">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Party Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-party-dem/10 p-3">
                    <div className="text-lg font-bold text-party-dem">
                      {
                        [
                          bill.sponsor.representative,
                          ...bill.cosponsors.map(c => c.representative),
                        ].filter(rep => rep.party === 'D').length
                      }
                    </div>
                    <div className="text-xs text-party-dem">Democrats</div>
                  </div>
                  <div className="bg-civiq-red/10 p-3">
                    <div className="text-lg font-bold text-civiq-red">
                      {
                        [
                          bill.sponsor.representative,
                          ...bill.cosponsors.map(c => c.representative),
                        ].filter(rep => rep.party === 'R').length
                      }
                    </div>
                    <div className="text-xs text-civiq-red">Republicans</div>
                  </div>
                  <div className="bg-gray-100 p-3">
                    <div className="text-lg font-bold text-gray-800">
                      {
                        [
                          bill.sponsor.representative,
                          ...bill.cosponsors.map(c => c.representative),
                        ].filter(rep => rep.party === 'I').length
                      }
                    </div>
                    <div className="text-xs text-gray-600">Independents</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sponsor */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Sponsor</h4>
              <div className="flex items-center space-x-4 p-4 bg-civiq-blue/10">
                <RepresentativePhoto
                  bioguideId={bill.sponsor.representative.bioguideId}
                  name={bill.sponsor.representative.name}
                  size="md"
                />
                <div>
                  <RepLink
                    bioguideId={bill.sponsor.representative.bioguideId}
                    name={bill.sponsor.representative.name}
                    className="text-lg font-medium"
                  />
                  <p className="text-gray-600">
                    {bill.sponsor.representative.party === 'D'
                      ? 'Democrat'
                      : bill.sponsor.representative.party === 'R'
                        ? 'Republican'
                        : 'Independent'}{' '}
                    • {bill.sponsor.representative.state}
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
            {bill.cosponsors.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Cosponsors ({bill.cosponsors.length})
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {bill.cosponsors.slice(0, 6).map(cosponsor => (
                    <div
                      key={cosponsor.representative.bioguideId}
                      className={`flex items-center space-x-3 p-3 border-2 hover:bg-white ${
                        cosponsor.withdrawn
                          ? 'border-gray-300 bg-white opacity-60'
                          : 'border-gray-200'
                      }`}
                    >
                      <RepresentativePhoto
                        bioguideId={cosponsor.representative.bioguideId}
                        name={cosponsor.representative.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <RepLink
                          bioguideId={cosponsor.representative.bioguideId}
                          name={cosponsor.representative.name}
                          className="text-sm font-medium truncate block"
                        />
                        <p className="text-xs text-gray-500 truncate">
                          {cosponsor.representative.party === 'D'
                            ? 'D'
                            : cosponsor.representative.party === 'R'
                              ? 'R'
                              : 'I'}
                          -{cosponsor.representative.state}
                          {cosponsor.representative.district &&
                            `-${cosponsor.representative.district}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cosponsor.withdrawn
                            ? 'Withdrawn'
                            : `Joined ${new Date(cosponsor.date).toLocaleDateString()}`}
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No cosponsors yet</p>
                <p className="text-xs mt-1">
                  Cosponsors may be added as the bill moves through Congress
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Public Law Badge (if enacted) */}
          {bill.laws && bill.laws.length > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-emerald-800">Enacted into Law</h3>
              </div>
              {bill.laws.map((law, index) => (
                <div key={index} className="mt-2">
                  <p className="text-emerald-700 font-semibold text-lg">
                    {law.type} {law.number}
                  </p>
                  <a
                    href={`https://www.congress.gov/public-laws/${bill.congress}th-congress`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 mt-1"
                  >
                    View on Congress.gov <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Bill Journey Timeline */}
          <BillJourneyTimeline
            actions={bill.status.timeline || []}
            currentStatus={bill.status.current}
            chamber={bill.chamber}
            introducedDate={bill.introducedDate}
          />

          {/* Text Versions */}
          {bill.textVersions && bill.textVersions.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-civiq-blue" />
                Text Versions ({bill.textVersions.length})
              </h3>
              <div className="space-y-3">
                {bill.textVersions.map((version, index) => (
                  <div key={index} className="p-3 bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{version.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(version.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {version.formats.map((format, fIndex) => (
                        <a
                          key={fIndex}
                          href={format.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-colors"
                        >
                          {format.type}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Committee Reports */}
          {bill.committeeReports && bill.committeeReports.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Committee Reports ({bill.committeeReports.length})
              </h3>
              <div className="space-y-2">
                {bill.committeeReports.map((report, index) => (
                  <a
                    key={index}
                    href={report.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-civiq-blue/10 border border-gray-200 hover:border-civiq-blue transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{report.citation}</span>
                    <ExternalLink className="w-4 h-4 text-civiq-blue" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Related Bills */}
          {bill.relatedBills && bill.relatedBills.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Related Bills ({bill.relatedBills.length})
              </h3>
              <div className="space-y-3">
                {bill.relatedBills.map((relatedBill, index) => {
                  // Parse bill number like "H.R. 1234" or "S. 567" into route format
                  const billMatch = relatedBill.number.match(
                    /^(H\.R\.|S\.|H\.Res\.|S\.Res\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*(\d+)/i
                  );
                  const billType =
                    billMatch?.[1]?.toLowerCase().replace(/\./g, '').replace(/\s+/g, '') ?? '';
                  const billNum = billMatch?.[2] ?? '';
                  const billRoute =
                    billMatch && billType && billNum
                      ? `/bill/${bill.congress}-${billType}-${billNum}`
                      : null;

                  return (
                    <Link
                      key={index}
                      href={billRoute || '#'}
                      className={`block p-3 border border-gray-200 transition-colors ${billRoute ? 'hover:bg-civiq-blue/10 hover:border-civiq-blue' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-civiq-blue hover:text-civiq-blue">
                            {relatedBill.number}
                          </p>
                          <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                            {relatedBill.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                                relatedBill.relationship === 'identical'
                                  ? 'bg-civiq-green/10 text-civiq-green'
                                  : relatedBill.relationship === 'supersedes'
                                    ? 'bg-civiq-red/10 text-civiq-red'
                                    : relatedBill.relationship === 'superseded'
                                      ? 'bg-civiq-red/10 text-civiq-red'
                                      : 'bg-civiq-blue/10 text-civiq-blue'
                              }`}
                            >
                              {relatedBill.relationship === 'identical'
                                ? 'Identical'
                                : relatedBill.relationship === 'supersedes'
                                  ? 'Supersedes'
                                  : relatedBill.relationship === 'superseded'
                                    ? 'Superseded by'
                                    : 'Related'}
                            </span>
                            {billRoute && (
                              <span className="text-xs text-civiq-blue">View bill →</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Committee Information */}
          {bill.committees && bill.committees.length > 0 && (
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Committee{bill.committees.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {bill.committees.map((committee, index) => (
                  <Link
                    key={index}
                    href={`/committee/${committee.committeeId}`}
                    className="flex items-center justify-between p-3 bg-white hover:bg-civiq-blue/10 border border-transparent hover:border-civiq-blue transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-civiq-blue">
                        {committee.name}
                      </p>
                      {committee.chamber && (
                        <p className="text-xs text-gray-500">{committee.chamber}</p>
                      )}
                    </div>
                    <span className="text-xs text-civiq-blue opacity-0 group-hover:opacity-100 transition-opacity">
                      View committee →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bill Details */}
          <div className="bg-white border-2 border-black p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Bill Type</span>
                <span className="text-sm text-gray-900">{bill.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Current Status</span>
                <span className={`text-sm px-2 py-1 ${getBillStatusColor(bill.status.current)}`}>
                  {getBillDisplayStatus(bill.status.current)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Cosponsors</span>
                <span className="text-sm text-gray-900">{bill.cosponsors.length}</span>
              </div>
              {bill.url && (
                <div className="pt-3">
                  <a
                    href={bill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-civiq-blue hover:text-civiq-blue text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View on Congress.gov
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Open Data Strip */}
      <OpenDataStrip
        feedUrl={`/api/feed/bill/${billId}`}
        feedLabel="Bill Feed"
        apiUrl={`/api/v1/bills/${billId}`}
        congressUrl={bill.url}
      />
    </div>
  );
}

// Legislative Process Section — AI-generated explanation of where a bill stands
interface LegislativeProcessSectionProps {
  explanation: ProcessExplanation;
}

function LegislativeProcessSection({ explanation }: LegislativeProcessSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border-2 border-black">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-civiq-blue" />
          <h3 className="text-lg font-semibold text-gray-900">Where This Bill Stands</h3>
          <span className="text-xs text-gray-500 ml-2">AI-generated</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Always show current status */}
      <div className="px-6 pb-4 -mt-2">
        <p className="text-gray-700 leading-relaxed">{explanation.currentStatus}</p>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
          {explanation.whatHappened && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-600" />
                What Happened
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">{explanation.whatHappened}</p>
            </div>
          )}

          {explanation.nextSteps && explanation.nextSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <ArrowRight className="w-4 h-4 text-civiq-blue" />
                Next Steps
              </h4>
              <ul className="space-y-1">
                {explanation.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-civiq-blue mt-0.5">{'>'}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.estimatedTimeline && (
            <div className="bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Estimated Timeline</h4>
              <p className="text-sm text-gray-700">{explanation.estimatedTimeline}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
            <AlertCircle className="h-3 w-3" />
            <span>AI-generated explanation • Source: {explanation.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Bill Text Section Component - Collapsible display of full bill text
interface BillTextSectionProps {
  fullText: {
    content: string;
    format: 'html' | 'text';
    version: string;
    date: string;
  };
}

function BillTextSection({ fullText }: BillTextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  // Truncate content for preview
  const previewLength = 2000;
  const isLongContent = fullText.content.length > previewLength;
  const rawContent =
    showFullText || !isLongContent ? fullText.content : fullText.content.slice(0, previewLength);
  const displayContent = useMemo(() => sanitizeBillHtml(rawContent), [rawContent]);

  return (
    <div className="bg-white border-2 border-black p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Gavel className="w-5 h-5 text-civiq-blue" />
          Full Bill Text
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{fullText.version}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Version: {fullText.version} •{' '}
              {new Date(fullText.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div
            className="prose prose-sm max-w-none bg-gray-50 p-4 border border-gray-200 overflow-auto max-h-[600px]"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />

          {isLongContent && !showFullText && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowFullText(true)}
                className="px-4 py-2 bg-civiq-blue/10 text-civiq-blue hover:bg-civiq-blue/10 transition-colors font-medium text-sm"
              >
                Show Full Text ({Math.round(fullText.content.length / 1000)}KB)
              </button>
            </div>
          )}

          {showFullText && isLongContent && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowFullText(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Collapse Text
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Visual stacked vote bar showing Yea/Nay/Not Voting segmented by party
function VoteBar({ vote }: { vote: BillVote }) {
  if (!vote.breakdown || !vote.votes) return null;

  const total = vote.votes.yea + vote.votes.nay + vote.votes.present + vote.votes.notVoting;
  if (total === 0) return null;

  // Segments use party colors: D=blue, R=red, I=gray (matching design system)
  // Yea = solid party color, Nay = lighter shade
  const demColors = getPartyColors('Democrat');
  const segments: { label: string; count: number; color: string }[] = [
    { label: 'D Yea', count: vote.breakdown.democratic.yea, color: demColors.hex },
    { label: 'R Yea', count: vote.breakdown.republican.yea, color: '#e11d07' },
    { label: 'I Yea', count: vote.breakdown.independent.yea, color: '#6b7280' },
    { label: 'D Nay', count: vote.breakdown.democratic.nay, color: demColors.hexLight },
    { label: 'R Nay', count: vote.breakdown.republican.nay, color: '#fca5a5' },
    { label: 'I Nay', count: vote.breakdown.independent.nay, color: '#d1d5db' },
    {
      label: 'Not Voting',
      count: vote.votes.notVoting + vote.votes.present,
      color: '#e5e7eb',
    },
  ].filter(s => s.count > 0);

  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden border-2 border-gray-300">
        {segments.map(seg => (
          <div
            key={seg.label}
            title={`${seg.label}: ${seg.count}`}
            style={{
              width: `${(seg.count / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            className="h-full"
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: demColors.hex }} />D
          Yea
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: '#e11d07' }} />R Yea
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5"
            style={{ backgroundColor: demColors.hexLight }}
          />
          D Nay
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: '#fca5a5' }} />R Nay
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: '#e5e7eb' }} />
          Not Voting
        </span>
      </div>
    </div>
  );
}

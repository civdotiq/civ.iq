'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import type { Bill, BillVote } from '@/types/bill';
import { getBillDisplayStatus, getBillStatusColor } from '@/types/bill';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { BillJourneyTimeline } from '@/features/legislation/components/BillJourneyTimeline';

interface ClientBillContentProps {
  billId: string;
}

export function ClientBillContent({ billId }: ClientBillContentProps) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-6 bg-white border-2 border-gray-300 rounded w-1/2"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
        </div>
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
      <div className="bg-white border-2 border-black p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl accent-title-underline text-gray-900">{bill.number}</h1>
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
                <DollarSign className="w-5 h-5 text-green-600" />
                CBO Cost Estimates ({bill.cboCostEstimates.length})
              </h3>
              <div className="space-y-3">
                {bill.cboCostEstimates.map((estimate, index) => (
                  <a
                    key={index}
                    href={estimate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
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
                      <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
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
                <ScrollText className="w-5 h-5 text-orange-600" />
                Amendments ({bill.amendments.count})
              </h3>
              <div className="p-4 bg-orange-50 border border-orange-200">
                <p className="text-gray-700">
                  This bill has <span className="font-bold">{bill.amendments.count}</span> amendment
                  {bill.amendments.count === 1 ? '' : 's'} proposed or adopted.
                </p>
                {bill.url && (
                  <a
                    href={`${bill.url}/amendments`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-orange-700 hover:text-orange-900 font-medium"
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
              <Vote className="w-5 h-5 text-blue-600" />
              Congressional Votes ({bill.votes?.length || 0})
            </h3>

            {bill.votes && bill.votes.length > 0 ? (
              <div className="space-y-4">
                {bill.votes.map((vote: BillVote, index: number) => {
                  const isPassed = vote.result === 'Passed' || vote.result === 'Agreed to';

                  return (
                    <Link
                      key={vote.voteId || index}
                      href={`/vote/${vote.rollNumber || vote.voteId}`}
                      className="block p-4 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isPassed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span
                              className={`font-semibold ${isPassed ? 'text-green-700' : 'text-red-700'}`}
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
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-700">{vote.votes.yea}</div>
                            <div className="text-xs text-green-600">Yea</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-lg font-bold text-red-700">{vote.votes.nay}</div>
                            <div className="text-xs text-red-600">Nay</div>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 rounded">
                            <div className="text-lg font-bold text-yellow-700">
                              {vote.votes.present}
                            </div>
                            <div className="text-xs text-yellow-600">Present</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="text-lg font-bold text-gray-700">
                              {vote.votes.notVoting}
                            </div>
                            <div className="text-xs text-gray-600">Not Voting</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-3 bg-gray-50 rounded mb-3">
                          <p className="text-sm text-gray-600">
                            Vote counts unavailable from Congress.gov
                          </p>
                        </div>
                      )}

                      {/* Party Breakdown */}
                      {vote.breakdown ? (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="font-medium text-blue-800 mb-1">Democrats</div>
                            <div className="text-blue-700">
                              {vote.breakdown.democratic.yea} Yea / {vote.breakdown.democratic.nay}{' '}
                              Nay
                            </div>
                          </div>
                          <div className="bg-red-50 p-2 rounded">
                            <div className="font-medium text-red-800 mb-1">Republicans</div>
                            <div className="text-red-700">
                              {vote.breakdown.republican.yea} Yea / {vote.breakdown.republican.nay}{' '}
                              Nay
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-800 mb-1">Independents</div>
                            <div className="text-gray-700">
                              {vote.breakdown.independent.yea} Yea /{' '}
                              {vote.breakdown.independent.nay} Nay
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 text-sm text-blue-600 font-medium flex items-center gap-1">
                        View all {vote.chamber === 'Senate' ? '100' : '435'} member votes →
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded">
                <Vote className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No recorded votes yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Roll call votes will appear here as the bill moves through Congress
                </p>
              </div>
            )}
          </div>

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
                  <div className="bg-blue-100 p-3">
                    <div className="text-lg font-bold text-blue-800">
                      {
                        [
                          bill.sponsor.representative,
                          ...bill.cosponsors.map(c => c.representative),
                        ].filter(rep => rep.party === 'D').length
                      }
                    </div>
                    <div className="text-xs text-blue-600">Democrats</div>
                  </div>
                  <div className="bg-red-100 p-3">
                    <div className="text-lg font-bold text-red-800">
                      {
                        [
                          bill.sponsor.representative,
                          ...bill.cosponsors.map(c => c.representative),
                        ].filter(rep => rep.party === 'R').length
                      }
                    </div>
                    <div className="text-xs text-red-600">Republicans</div>
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
              <div className="flex items-center space-x-4 p-4 bg-blue-50">
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
                          ? 'border-gray-300 bg-white border-2 border-gray-300 opacity-60'
                          : 'border-gray-200'
                      }`}
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
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 hover:border-civiq-blue hover:bg-blue-50 transition-colors"
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
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{report.citation}</span>
                    <ExternalLink className="w-4 h-4 text-blue-600" />
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
                      className={`block p-3 border border-gray-200 transition-colors ${billRoute ? 'hover:bg-blue-50 hover:border-blue-300' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            {relatedBill.number}
                          </p>
                          <p className="text-xs text-gray-700 mt-1 line-clamp-2">
                            {relatedBill.title}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                relatedBill.relationship === 'identical'
                                  ? 'bg-green-100 text-green-800'
                                  : relatedBill.relationship === 'supersedes'
                                    ? 'bg-orange-100 text-orange-800'
                                    : relatedBill.relationship === 'superseded'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
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
                              <span className="text-xs text-blue-600">View bill →</span>
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
                    className="flex items-center justify-between p-3 bg-white hover:bg-blue-50 border border-transparent hover:border-blue-300 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {committee.name}
                      </p>
                      {committee.chamber && (
                        <p className="text-xs text-gray-500">{committee.chamber}</p>
                      )}
                    </div>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <span
                  className={`text-sm px-2 py-1 rounded-full ${getBillStatusColor(bill.status.current)}`}
                >
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
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
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
  const displayContent =
    showFullText || !isLongContent ? fullText.content : fullText.content.slice(0, previewLength);

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
                className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium text-sm"
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

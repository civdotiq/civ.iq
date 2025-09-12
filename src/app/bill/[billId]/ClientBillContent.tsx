'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Calendar, FileText } from 'lucide-react';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus, getBillStatusColor } from '@/types/bill';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

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
        <div className="h-6 bg-gray-100 rounded w-1/2"></div>
        <div className="grid grid-cols-4 gap-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
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
      <div className="bg-white rounded-lg shadow-lg p-8">
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
          <div className="bg-white rounded-lg shadow-lg p-6">
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
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Congress
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {bill.congress}th Congress
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              {/* Always show introduction */}
              <div className="flex">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Introduced</p>
                  <p className="text-xs text-gray-500">
                    {new Date(bill.introducedDate).toLocaleDateString()} • {bill.chamber}
                  </p>
                </div>
              </div>

              {/* Show latest action */}
              {bill.status.lastAction && (
                <div className="flex">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{bill.status.lastAction.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(bill.status.lastAction.date).toLocaleDateString()}
                      {bill.status.lastAction.chamber && ` • ${bill.status.lastAction.chamber}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Show additional timeline if available */}
              {bill.status.timeline &&
                bill.status.timeline.length > 0 &&
                bill.status.timeline.slice(0, 3).map((action, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{action.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(action.date).toLocaleDateString()}
                        {action.chamber && ` • ${action.chamber}`}
                      </p>
                    </div>
                  </div>
                ))}

              {bill.status.timeline && bill.status.timeline.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  And {bill.status.timeline.length - 3} more actions
                </p>
              )}
            </div>
          </div>

          {/* Committee Information */}
          {bill.committees && bill.committees.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Committee{bill.committees.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {bill.committees.map((committee, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{committee.name}</p>
                      {committee.chamber && (
                        <p className="text-xs text-gray-500">{committee.chamber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bill Details */}
          <div className="bg-white rounded-lg shadow-lg p-6">
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

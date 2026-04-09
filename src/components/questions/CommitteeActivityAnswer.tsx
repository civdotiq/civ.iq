/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CommitteeActivityAnswer — pod renderer for the committee-activity question.
 *
 * Pods: Recent hearings, Bills in committee, Jurisdiction, Sources.
 * Server component. Data from committee-activity.service + committee.service.
 */

import Link from 'next/link';
import type {
  CommitteeActivityMeeting,
  CommitteeActivityBill,
} from '@/lib/services/committee-activity.service';

interface CommitteeActivityAnswerProps {
  meetings: CommitteeActivityMeeting[];
  bills: CommitteeActivityBill[];
  jurisdiction: string;
}

function RecentHearingsPod({ meetings }: { meetings: CommitteeActivityMeeting[] }) {
  if (!meetings.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Recent hearings</h2>
        <p className="type-sm text-gray-500">
          No recent hearings or meetings found for this committee. Data may be temporarily
          unavailable from Congress.gov.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Recent hearings</h2>
      <ul className="divide-y divide-gray-200">
        {meetings.map(meeting => (
          <li key={meeting.eventId} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="type-sm text-black line-clamp-2">{meeting.title}</p>
                <p className="type-xs text-gray-500 mt-0.5">
                  {meeting.date
                    ? new Date(meeting.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date unavailable'}
                </p>
              </div>
              <span className="type-xs text-gray-500 shrink-0">{meeting.type}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BillsInCommitteePod({ bills }: { bills: CommitteeActivityBill[] }) {
  if (!bills.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Bills in committee</h2>
        <p className="type-sm text-gray-500">
          No bills currently available. Committee bill data may be temporarily unavailable from
          Congress.gov.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Bills in committee</h2>
      <ul className="divide-y divide-gray-200">
        {bills.slice(0, 10).map(bill => (
          <li key={bill.billId} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/bill/${bill.billId}`}
                  className="type-sm text-[#3ea2d4] hover:underline line-clamp-1"
                >
                  {bill.billNumber}: {bill.title}
                </Link>
                <p className="type-xs text-gray-500 mt-0.5">
                  {bill.sponsor}
                  {bill.introducedDate && (
                    <>
                      {' · '}
                      {new Date(bill.introducedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </p>
              </div>
              <span className="type-xs text-gray-500 shrink-0">{bill.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JurisdictionPod({ jurisdiction }: { jurisdiction: string }) {
  if (!jurisdiction) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Jurisdiction</h2>
        <p className="type-sm text-gray-500">Jurisdiction information is not available.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Jurisdiction</h2>
      <p className="type-sm text-gray-700 leading-relaxed">{jurisdiction}</p>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Committee activity data from{' '}
        <a
          href="https://www.congress.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress.gov
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function CommitteeActivityAnswer({
  meetings,
  bills,
  jurisdiction,
}: CommitteeActivityAnswerProps) {
  return (
    <>
      <RecentHearingsPod meetings={meetings} />
      <BillsInCommitteePod bills={bills} />
      <JurisdictionPod jurisdiction={jurisdiction} />
      <SourcesPod />
    </>
  );
}
